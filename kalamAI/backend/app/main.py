import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import rooms, ws, auth, signal, meetings
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

app = FastAPI(title="KalamAI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["rooms"])
app.include_router(ws.router, tags=["websocket"])
app.include_router(signal.router, tags=["webrtc-signal"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["meetings"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "kalamai-backend"}
