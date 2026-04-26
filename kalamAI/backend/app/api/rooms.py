import secrets
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Literal
from app.services.room_manager import RoomManager

logger = logging.getLogger(__name__)
router = APIRouter()
room_manager = RoomManager()

VALID_LANGUAGES = {"fr", "en", "ar", "ha", "ff", "sw", "pt", "wo", "am", "bm"}


def _generate_code() -> str:
    # 6 chars from a-z0-9 via cryptographically secure random = 36^6 ≈ 2.2B combinations
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # remove confusable chars (0/O, 1/I)
    return "".join(secrets.choice(alphabet) for _ in range(6))


class CreateRoomRequest(BaseModel):
    host_name: str = Field(..., min_length=1, max_length=64)
    language: str = Field("fr", min_length=2, max_length=3)

    def validate_language(self) -> None:
        if self.language not in VALID_LANGUAGES:
            raise HTTPException(422, f"Unsupported language: {self.language}")


class JoinRoomRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    language: str = Field("fr", min_length=2, max_length=3)

    def validate_language(self) -> None:
        if self.language not in VALID_LANGUAGES:
            raise HTTPException(422, f"Unsupported language: {self.language}")


@router.post("")
async def create_room(req: CreateRoomRequest):
    req.validate_language()
    code = _generate_code()
    room = await room_manager.create_room(code, req.host_name, req.language)
    logger.info("Room created: %s by %s", code, req.host_name)
    return {"code": code, "link": f"/room/{code}", "room": room}


@router.get("/{code}")
async def get_room(code: str):
    room = await room_manager.get_room(code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.post("/{code}/join")
async def join_room(code: str, req: JoinRoomRequest):
    req.validate_language()
    room = await room_manager.get_room(code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    participant = await room_manager.add_participant(code.upper(), req.name, req.language)
    logger.info("Participant %s joined room %s", req.name, code.upper())
    return {"participant": participant, "room": room}
