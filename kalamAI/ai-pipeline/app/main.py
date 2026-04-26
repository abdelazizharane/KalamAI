import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, Request
from app.orchestrator import TranslationOrchestrator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)

logger = logging.getLogger(__name__)
orchestrator = TranslationOrchestrator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fire-and-forget: server starts immediately while models load in background.
    # /process returns "warming_up" until models_loaded=True.
    asyncio.create_task(orchestrator.load_models())
    yield


app = FastAPI(title="KalamAI AI Pipeline", version="1.0.0", lifespan=lifespan)


@app.post("/process")
async def process_audio(request: Request, background_tasks: BackgroundTasks):
    if not orchestrator.models_loaded:
        return {"status": "warming_up"}
    audio_chunk = await request.body()
    if not audio_chunk:
        return {"status": "empty"}
    room_code = request.headers.get("X-Room-Code", "")
    user_id = request.headers.get("X-User-Id", "")
    source_language = request.headers.get("X-Source-Language", "")  # fallback only; STT auto-detects
    background_tasks.add_task(
        orchestrator.process, audio_chunk, room_code, user_id, source_language
    )
    return {"status": "processing"}


@app.get("/health")
async def health():
    return {"status": "ok", "models_loaded": orchestrator.models_loaded}
