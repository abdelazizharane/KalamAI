import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter()

# room_code -> {user_id -> {"ws": WebSocket, "name": str}}
_rooms: dict[str, dict[str, dict]] = {}

# Messages broadcast to the whole room (no "to" field required)
_BROADCAST_TYPES = {"chat", "reaction", "media-state", "raise-hand", "screen-share"}

# Messages relayed to a specific peer (require "to" field)
_RELAY_TYPES = {"offer", "answer", "ice-candidate", "host-mute", "host-kick", "host-cam-off"}


@router.websocket("/ws/signal/{room_code}/{user_id}")
async def signal_ws(ws: WebSocket, room_code: str, user_id: str):
    await ws.accept()
    room = _rooms.setdefault(room_code, {})

    # Expect hello with display name (5 s timeout)
    display_name = user_id
    try:
        hello = await asyncio.wait_for(ws.receive_json(), timeout=5.0)
        if hello.get("type") == "hello":
            display_name = str(hello.get("name", user_id))[:64]
    except Exception:
        pass

    # Tell newcomer who is already in the room
    await ws.send_json({
        "type": "peers",
        "peers": [
            {"id": pid, "name": info["name"]}
            for pid, info in room.items()
        ],
    })

    # Notify existing peers
    for info in list(room.values()):
        try:
            await info["ws"].send_json(
                {"type": "peer-joined", "from": user_id, "name": display_name}
            )
        except Exception:
            pass

    room[user_id] = {"ws": ws, "name": display_name}
    logger.info("signal: %s (%s) joined room %s", user_id, display_name, room_code)

    try:
        while True:
            msg = await ws.receive_json()
            msg_type = msg.get("type")
            target_id = msg.get("to")

            if msg_type in _BROADCAST_TYPES:
                payload = {**msg, "from": user_id, "name": display_name}
                for pid, info in list(room.items()):
                    if pid != user_id:
                        try:
                            await info["ws"].send_json(payload)
                        except Exception:
                            pass

            elif msg_type in _RELAY_TYPES and target_id:
                target = room.get(target_id)
                if target:
                    try:
                        await target["ws"].send_json({**msg, "from": user_id})
                    except Exception:
                        pass

    except WebSocketDisconnect:
        pass
    finally:
        room.pop(user_id, None)
        if not room:
            _rooms.pop(room_code, None)
        logger.info("signal: %s left room %s", user_id, room_code)
        for info in list(room.values()):
            try:
                await info["ws"].send_json({"type": "peer-left", "from": user_id})
            except Exception:
                pass
