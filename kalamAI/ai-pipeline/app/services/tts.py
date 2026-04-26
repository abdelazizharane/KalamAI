import asyncio
import logging
import os
import struct
import subprocess
import tempfile

import numpy as np
import torch

logger = logging.getLogger(__name__)

# ── edge-tts: neural voices (online, no API key) ──────────────────────────────
EDGE_VOICES: dict[str, str] = {
    "fr": "fr-FR-DeniseNeural",
    "en": "en-US-JennyNeural",
    "ar": "ar-EG-SalmaNeural",
    "sw": "sw-KE-ZuriNeural",
    "pt": "pt-BR-FranciscaNeural",
    "am": "am-ET-MekdesNeural",
}

# ── MMS-TTS: Meta offline models (ISO 639-3 codes) ────────────────────────────
# wol (Wolof) is gated on HuggingFace — kept as espeak fallback.
MMS_MODELS: dict[str, str] = {
    "ha": "facebook/mms-tts-hau",
    "ff": "facebook/mms-tts-ful",
    "bm": "facebook/mms-tts-bam",
}

# ── espeak-ng: offline fallback for any language ──────────────────────────────
ESPEAK_VOICES: dict[str, str] = {
    "ha": "ha",
    "ff": "ha",
    "wo": "fr",   # no Wolof voice — French is closest
    "bm": "ha",
    "fr": "fr", "en": "en", "ar": "ar",
    "sw": "sw",  "pt": "pt", "am": "am",
}


def _pcm_to_wav(samples: np.ndarray, sr: int) -> bytes:
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2").tobytes()
    n = len(pcm)
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36 + n, b"WAVE",
        b"fmt ", 16, 1, 1, sr, sr * 2, 2, 16,
        b"data", n,
    )
    return header + pcm


def _load_mms_model(model_id: str):
    """
    Load a VitsModel checkpoint and fix the weight_g/weight_v →
    parametrizations.weight.original0/1 key mismatch introduced when
    transformers switched from hook-based weight_norm to parametrize API.
    """
    from huggingface_hub import hf_hub_download
    from transformers import VitsModel

    # First pass: builds the model architecture with the new parametrize layout.
    model = VitsModel.from_pretrained(model_id)

    # Second pass: load original weights and remap keys before applying.
    try:
        try:
            import safetensors.torch as st_torch
            sf_path = hf_hub_download(model_id, "model.safetensors")
            old_sd = st_torch.load_file(sf_path, device="cpu")
        except Exception:
            pt_path = hf_hub_download(model_id, "pytorch_model.bin")
            old_sd = torch.load(pt_path, map_location="cpu", weights_only=True)

        new_sd: dict[str, torch.Tensor] = {}
        for k, v in old_sd.items():
            if k.endswith(".weight_g"):
                new_sd[k[:-len("weight_g")] + "parametrizations.weight.original0"] = v
            elif k.endswith(".weight_v"):
                new_sd[k[:-len("weight_v")] + "parametrizations.weight.original1"] = v
            else:
                new_sd[k] = v

        missing, unexpected = model.load_state_dict(new_sd, strict=False)
        if missing:
            logger.debug("MMS %s: %d missing keys after remap", model_id, len(missing))
    except Exception:
        logger.warning("MMS weight remapping failed for %s — using unremapped weights", model_id)

    model.eval()
    return model


class HybridTTS:
    """
    Three-tier TTS:
      1. edge-tts (neural, online)  — fr/en/ar/sw/pt/am
      2. MMS-TTS  (neural, offline) — ha/ff/bm
      3. espeak-ng (rule-based)     — universal fallback
    """

    def __init__(self):
        self.loaded = False
        self._mms_cache: dict[str, tuple] = {}   # lang → (model, tokenizer)

    async def load(self):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._preload_mms)
        self.loaded = True
        logger.info("TTS ready (edge-tts + MMS-TTS + espeak-ng fallback)")

    def _preload_mms(self):
        from transformers import AutoTokenizer
        for lang, model_id in MMS_MODELS.items():
            try:
                logger.info("Loading MMS-TTS %s (%s)...", lang, model_id)
                model = _load_mms_model(model_id)
                tokenizer = AutoTokenizer.from_pretrained(model_id)
                self._mms_cache[lang] = (model, tokenizer)
                logger.info("MMS-TTS %s loaded (sr=%d)", lang, model.config.sampling_rate)
            except Exception:
                logger.warning("MMS-TTS %s unavailable — espeak-ng fallback active", lang)

    # ── public API ────────────────────────────────────────────────────────────

    async def synthesize(self, text: str, language: str) -> bytes:
        if not text.strip():
            return b""

        # Tier 1: edge-tts
        if language in EDGE_VOICES:
            try:
                audio = await self._edge(text, EDGE_VOICES[language])
                if audio:
                    return audio
            except Exception:
                logger.warning("edge-tts failed for %s, falling back", language)

        # Tier 2: MMS-TTS
        if language in self._mms_cache:
            try:
                loop = asyncio.get_event_loop()
                audio = await loop.run_in_executor(None, self._mms, text, language)
                if audio:
                    return audio
            except Exception:
                logger.warning("MMS-TTS failed for %s, falling back to espeak-ng", language)

        # Tier 3: espeak-ng
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._espeak, text, language)

    # ── tier implementations ──────────────────────────────────────────────────

    async def _edge(self, text: str, voice: str) -> bytes:
        import edge_tts
        communicate = edge_tts.Communicate(text, voice)
        chunks: list[bytes] = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        return b"".join(chunks)

    def _mms(self, text: str, language: str) -> bytes:
        model, tokenizer = self._mms_cache[language]
        inputs = tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            waveform = model(**inputs).waveform.squeeze().numpy()
        return _pcm_to_wav(waveform, model.config.sampling_rate)

    def _espeak(self, text: str, language: str) -> bytes:
        voice = ESPEAK_VOICES.get(language, "en")
        tmp_out = tempfile.mktemp(suffix=".wav")
        try:
            subprocess.run(
                ["espeak-ng", "-v", voice, "-w", tmp_out, "--", text],
                check=True, capture_output=True, timeout=30,
            )
            with open(tmp_out, "rb") as f:
                return f.read()
        except subprocess.CalledProcessError as e:
            logger.error("espeak-ng error (voice=%s): %s", voice, e.stderr.decode(errors="replace"))
            return b""
        except FileNotFoundError:
            logger.error("espeak-ng not found in container")
            return b""
        except Exception:
            logger.exception("TTS unexpected error")
            return b""
        finally:
            if os.path.exists(tmp_out):
                os.unlink(tmp_out)


EspeakTTS = HybridTTS
