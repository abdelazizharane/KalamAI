import asyncio
import json
import logging
import secrets
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr

from app.core.auth_deps import get_current_user
from app.services.redis_stream import RedisStreamService
from app.services.email_service import send_meeting_invitation

logger = logging.getLogger(__name__)
router = APIRouter()
_redis = RedisStreamService()

_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _gen_code() -> str:
    return "".join(secrets.choice(_CHARS) for _ in range(6))


class ScheduleRequest(BaseModel):
    title: str
    scheduled_at: str          # ISO-8601 datetime
    participants: List[EmailStr]
    description: Optional[str] = None


class UpdateStatusRequest(BaseModel):
    status: str                # "cancelled"


# ── Create a scheduled meeting ────────────────────────────────────────────────
@router.post("/schedule")
async def schedule_meeting(req: ScheduleRequest, user=Depends(get_current_user)):
    if not req.title.strip():
        raise HTTPException(status_code=422, detail="Le titre est requis")

    meeting_id = str(uuid.uuid4())
    room_code = _gen_code()

    meeting = {
        "id": meeting_id,
        "title": req.title.strip(),
        "description": (req.description or "").strip(),
        "scheduled_at": req.scheduled_at,
        "host_id": user["id"],
        "host_name": user["name"],
        "room_code": room_code,
        "participants": list(req.participants),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "scheduled",
    }

    # Persist meeting (30 days TTL)
    await _redis.set(f"meeting:{meeting_id}", json.dumps(meeting), ex=60 * 60 * 24 * 30)

    # Append to user's meeting index (1-year TTL)
    idx_key = f"user:{user['id']}:meetings"
    raw = await _redis.get(idx_key)
    ids: list = json.loads(raw) if raw else []
    ids.append(meeting_id)
    await _redis.set(idx_key, json.dumps(ids), ex=60 * 60 * 24 * 365)

    # Fire-and-forget email invitations
    for email in req.participants:
        asyncio.create_task(
            send_meeting_invitation(
                to_email=email,
                host_name=user["name"],
                meeting_title=req.title.strip(),
                description=(req.description or "").strip(),
                scheduled_at=req.scheduled_at,
                room_code=room_code,
            )
        )

    logger.info("Meeting scheduled: %s by %s (%d guests)", room_code, user["id"], len(req.participants))
    return {"meeting": meeting}


# ── List authenticated user's meetings ────────────────────────────────────────
@router.get("/my")
async def get_my_meetings(user=Depends(get_current_user)):
    idx_key = f"user:{user['id']}:meetings"
    raw = await _redis.get(idx_key)
    if not raw:
        return {"meetings": []}

    ids = json.loads(raw)
    meetings = []
    for mid in ids:
        data = await _redis.get(f"meeting:{mid}")
        if data:
            meetings.append(json.loads(data))

    # Sort: upcoming first, then past
    now = datetime.now(timezone.utc).isoformat()
    meetings.sort(key=lambda m: m["scheduled_at"])
    return {"meetings": meetings}


# ── Cancel a meeting ──────────────────────────────────────────────────────────
@router.patch("/{meeting_id}/cancel")
async def cancel_meeting(meeting_id: str, user=Depends(get_current_user)):
    data = await _redis.get(f"meeting:{meeting_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Réunion introuvable")

    meeting = json.loads(data)
    if meeting["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")

    meeting["status"] = "cancelled"
    await _redis.set(f"meeting:{meeting_id}", json.dumps(meeting), ex=60 * 60 * 24 * 30)
    return {"ok": True, "meeting": meeting}
