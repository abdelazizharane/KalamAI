import logging
import os
import redis.asyncio as aioredis
from app.services.stt import WhisperSTT
from app.services.translation import SeamlessTranslator
from app.services.tts import EspeakTTS

logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = ["fr", "en", "ar", "ha", "ff", "sw", "pt", "wo", "am", "bm"]


class TranslationOrchestrator:
    def __init__(self):
        device = os.getenv("DEVICE", "cpu")
        self.stt = WhisperSTT(device=device)
        self.translator = SeamlessTranslator()
        self.tts = EspeakTTS()
        self.models_loaded = False
        self._redis: aioredis.Redis | None = None

    async def load_models(self):
        logger.info("Loading STT model...")
        await self.stt.load()
        logger.info("Loading translation model...")
        await self.translator.load()
        logger.info("Loading TTS model...")
        await self.tts.load()
        self.models_loaded = True
        logger.info("All models ready")

    async def _get_redis(self) -> aioredis.Redis:
        if not self._redis:
            url = os.getenv("REDIS_URL", "redis://redis:6379")
            self._redis = await aioredis.from_url(url, decode_responses=False)
        return self._redis

    async def process(
        self,
        audio_chunk: bytes,
        room_code: str,
        user_id: str,
        source_lang: str,  # kept for fallback only; spoken language is auto-detected by STT
    ):
        try:
            # Auto-detect spoken language — never use the listener's language as source hint
            transcript, detected_lang = await self.stt.transcribe(audio_chunk)
            if not transcript:
                return

            # Use Whisper-detected language; fall back to header value if detection returned empty
            actual_source = detected_lang or source_lang
            logger.info(
                "room=%s user=%s detected_lang=%s transcript=%s",
                room_code, user_id, actual_source, transcript[:60],
            )
            r = await self._get_redis()

            for target_lang in SUPPORTED_LANGUAGES:
                if target_lang == actual_source:
                    continue

                channel = f"room:{room_code}:lang:{target_lang}"
                subs = await r.pubsub_numsub(channel)
                listener_count = subs[0][1] if subs else 0
                if listener_count == 0:
                    continue

                translated = await self.translator.translate(transcript, actual_source, target_lang)
                if not translated:
                    continue

                audio = await self.tts.synthesize(translated, target_lang)
                if audio:
                    await r.publish(channel, audio)
                    logger.debug("Published %d bytes audio to %s", len(audio), channel)

        except Exception:
            logger.exception("Pipeline error: room=%s user=%s", room_code, user_id)
