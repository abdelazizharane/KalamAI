import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from app.services.redis_stream import RedisStreamService

_redis = RedisStreamService()
ROOM_TTL = 86400  # 24h


class RoomManager:
    async def create_room(self, code: str, host_name: str, language: str) -> dict:
        room = {
            "code": code,
            "host": host_name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "active": True,
        }
        await _redis.set(f"room:{code}", json.dumps(room), ex=ROOM_TTL)
        # Participants stored in a separate hash key for atomic add/remove
        await _redis.delete(f"room:{code}:participants")
        return {**room, "participants": []}

    async def get_room(self, code: str) -> Optional[dict]:
        data = await _redis.get(f"room:{code}")
        if not data:
            return None
        room = json.loads(data)
        raw = await _redis.hgetall(f"room:{code}:participants")
        room["participants"] = [json.loads(v) for v in raw.values()]
        return room

    async def add_participant(self, code: str, name: str, language: str) -> Optional[dict]:
        room_data = await _redis.get(f"room:{code}")
        if not room_data:
            return None
        participant = {"id": str(uuid.uuid4()), "name": name, "language": language}
        # HSET is atomic — no read-modify-write race condition
        await _redis.hset(f"room:{code}:participants", participant["id"], json.dumps(participant))
        await _redis.expire(f"room:{code}:participants", ROOM_TTL)
        return participant

    async def remove_participant(self, code: str, user_id: str):
        # HDEL is atomic
        await _redis.hdel(f"room:{code}:participants", user_id)
