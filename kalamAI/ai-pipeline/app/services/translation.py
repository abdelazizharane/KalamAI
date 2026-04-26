import asyncio
import logging
import torch
from transformers import AutoProcessor, SeamlessM4Tv2ForTextToText

logger = logging.getLogger(__name__)

# ISO 639-1 → SeamlessM4T BCP-47 codes
LANG_MAP: dict[str, str] = {
    "fr": "fra", "en": "eng", "ar": "arb", "ha": "hau",
    "ff": "ful", "sw": "swh", "pt": "por", "wo": "wol",
    "am": "amh", "bm": "bam",
}

DEFAULT_MODEL_ID = "facebook/seamless-m4t-v2-large"


class SeamlessTranslator:
    def __init__(self):
        import os
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_id = os.getenv("SEAMLESS_MODEL", DEFAULT_MODEL_ID)

    async def load(self):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_sync)

    def _load_sync(self):
        logger.info("Loading SeamlessM4T (%s) on %s...", self.model_id, self.device)
        self.processor = AutoProcessor.from_pretrained(self.model_id)
        self.model = SeamlessM4Tv2ForTextToText.from_pretrained(self.model_id)
        self.model.to(self.device).eval()
        logger.info("SeamlessM4T loaded")

    async def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if not self.model or not text.strip():
            return ""
        src = LANG_MAP.get(source_lang, "fra")
        tgt = LANG_MAP.get(target_lang, "eng")
        if src == tgt:
            return text
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._translate_sync, text, src, tgt)

    def _translate_sync(self, text: str, src: str, tgt: str) -> str:
        try:
            inputs = self.processor(text=text, src_lang=src, return_tensors="pt").to(self.device)
            with torch.no_grad():
                tokens = self.model.generate(**inputs, tgt_lang=tgt)
            result = self.processor.decode(tokens[0].tolist(), skip_special_tokens=True)
            logger.debug("Translation %s->%s: %s", src, tgt, result[:80])
            return result
        except Exception:
            logger.exception("Translation error %s->%s", src, tgt)
            return ""
