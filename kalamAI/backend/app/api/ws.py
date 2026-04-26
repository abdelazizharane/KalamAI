import asyncio
import logging
import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.redis_stream import RedisStreamService
from app.services.room_manager import RoomManager
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()
_redis = RedisStreamService()
_rooms = RoomManager()


@router.websocket("/ws/{room_code}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, user_id: str):
    await websocket.accept()
    logger.info("WS connected: room=%s user=%s", room_code, user_id)

    try:
        init = await websocket.receive_json()
        listening_lang: str = init.get("language", "fr")
        channel = f"room:{room_code}:lang:{listening_lang}"

        send_task = asyncio.create_task(_stream_translated_audio(websocket, channel))
        recv_task = asyncio.create_task(_capture_and_forward(websocket, room_code, user_id))

        done, pending = await asyncio.wait(
            [send_task, recv_task], return_when=asyncio.FIRST_COMPLETED
        )
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except WebSocketDisconnect:
        logger.info("WS disconnected: room=%s user=%s", room_code, user_id)
    except Exception:
        logger.exception("WS error: room=%s user=%s", room_code, user_id)
    finally:
        await _rooms.remove_participant(room_code, user_id)


async def _stream_translated_audio(websocket: WebSocket, channel: str):
    pubsub = await _redis.subscribe(channel)
    try:
        async for audio_bytes in _redis.listen(pubsub):
            await websocket.send_bytes(audio_bytes)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Audio stream error on channel %s", channel)
    finally:
        try:
            await pubsub.unsubscribe()
        except Exception:
            pass


async def _capture_and_forward(
    websocket: WebSocket, room_code: str, user_id: str
):
    # Note: X-Source-Language is omitted — the AI pipeline auto-detects the spoken language
    # via Whisper. Sending the listener's language here was the root cause of wrong transcription.
    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=30.0, write=30.0, pool=5.0)) as client:
        while True:
            try:
                data = await websocket.receive_bytes()
                if not data:
                    continue
                await client.post(
                    f"{settings.ai_pipeline_url}/process",
                    content=data,
                    headers={
                        "X-Room-Code": room_code,
                        "X-User-Id": user_id,
                    },
                )
            except WebSocketDisconnect:
                break
            except httpx.TimeoutException:
                logger.warning("AI pipeline timeout for room=%s", room_code)
            except Exception:
                logger.exception("Capture error: room=%s user=%s", room_code, user_id)
                break
