import asyncio
import logging
import os
import subprocess
import tempfile
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)


class WhisperSTT:
    def __init__(self, device: str = "cpu"):
        self.device = device if device in ("cpu", "cuda") else "cpu"
        self.model_size = os.getenv("WHISPER_MODEL", "medium")
        self.model: WhisperModel | None = None

    async def load(self):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_sync)

    def _load_sync(self):
        logger.info("Loading Whisper %s on %s...", self.model_size, self.device)
        self.model = WhisperModel(self.model_size, device=self.device, compute_type="int8")
        logger.info("Whisper model loaded")

    async def transcribe(self, audio_bytes: bytes) -> tuple[str, str]:
        """Returns (transcript, detected_language). Language is always auto-detected."""
        if not self.model or not audio_bytes:
            return "", ""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._run, audio_bytes)

    def _to_wav(self, src_path: str) -> str | None:
        """Convert any audio file to 16 kHz mono WAV via ffmpeg subprocess.
        Returns path to WAV file, or None on failure. Caller must delete the file."""
        wav_fd, wav_path = tempfile.mkstemp(suffix=".wav")
        os.close(wav_fd)
        try:
            result = subprocess.run(
                [
                    "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
                    "-fflags", "+discardcorrupt+igndts",  # tolerate fragmented/corrupt WebM
                    "-i", src_path,
                    "-ar", "16000", "-ac", "1", "-f", "wav", wav_path,
                ],
                capture_output=True,
                timeout=20,
            )
            if result.returncode == 0 and os.path.getsize(wav_path) > 0:
                return wav_path
            logger.warning("ffmpeg failed (rc=%d): %s", result.returncode, result.stderr.decode()[:200])
        except Exception:
            logger.exception("ffmpeg conversion error")
        try:
            os.unlink(wav_path)
        except OSError:
            pass
        return None

    def _run(self, audio_bytes: bytes) -> tuple[str, str]:
        src_path: str | None = None
        wav_path: str | None = None
        try:
            # Write browser audio to temp file (WebM/Opus from MediaRecorder)
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
                tmp.write(audio_bytes)
                src_path = tmp.name

            # Convert to WAV using subprocess ffmpeg — handles fragmented WebM that PyAV rejects
            wav_path = self._to_wav(src_path)
            if not wav_path:
                return "", ""

            segments, info = self.model.transcribe(
                wav_path,
                language=None,          # always auto-detect spoken language
                beam_size=5,
                vad_filter=True,
                condition_on_previous_text=False,
            )

            # Discard low-confidence detections — Whisper hallucinates on silence/noise
            prob = info.language_probability or 0.0
            logger.info(
                "STT lang=%s prob=%.2f",
                info.language, prob,
            )
            if prob < 0.70:
                logger.info("STT skipped: low confidence (%.2f < 0.70)", prob)
                return "", ""

            transcript = " ".join(s.text.strip() for s in segments)
            detected = info.language or ""
            if transcript:
                logger.info("STT detected_lang=%s transcript=%s", detected, transcript[:80])
            return transcript, detected
        except Exception:
            logger.exception("STT transcription error")
            return "", ""
        finally:
            for p in (src_path, wav_path):
                if p:
                    try:
                        os.unlink(p)
                    except OSError:
                        pass
