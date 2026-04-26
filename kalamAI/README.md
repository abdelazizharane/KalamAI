# KalamAI

> **Kalam** = “word” in Chadian Arabic — the voice meeting of Africa.

KalamAI is a real-time multilingual video conferencing platform designed for Africa. It allows each participant to speak in their native language and hear the meeting translated live into their chosen language — no setup required, directly in the browser.


**Creator:** Abdel-aziz Harane
---

## Problem Solved
In Africa, multilingual meetings are the norm: a room can bring together French speakers, Arabic speakers, and speakers of Hausa or Fulfulde. Without the right tool, one language (often French or English) dominates, excluding the others. KalamAI removes this language barrier.

---


## Architecture — Speech-to-Speech Pipeline

```
Speaker (speech)

    │

    ▼

WebSocket Backend (FastAPI + Redis)

    │

    ▼

AI Pipeline

    ├─ STT: faster-whisper (Whisper medium)

    │         → transcription + automatic language detection

    │

    ├─ Translation: Meta SeamlessM4T v2

    │               → source text → target text

    │

    └─ TTS: HybridTTS

              ├─ Tier 1: edge-tts (neural voice, fr/en/ar/sw/pt/am)

              ├─ Tier 2: Meta MMS-TTS offline (ha/ff/bm)

              └─ Tier 3: espeak-ng (universal fallback)

    │

    ▼

Redis Pub/Sub — channel: room:{code}:lang:{language}

    │

    ▼

Listener hears the voice translated into their language
```

---

## Tech Stack

| Layer          | Technology                                 |
| -------------- | ------------------------------------------ |
| Frontend       | React 18 + TypeScript + Vite + TailwindCSS |
| Backend        | FastAPI + Redis + WebSockets               |
| STT            | faster-whisper (OpenAI Whisper medium)     |
| Translation    | Meta SeamlessM4T v2 (text-to-text)         |
| Neural TTS     | edge-tts (Microsoft) + Meta MMS-TTS        |
| Fallback TTS   | espeak-ng                                  |
| Infrastructure | Docker Compose, nginx, self-hosted         |
| Desktop        | Electron (Windows, macOS, Linux)           |

---

## Supported Languages — v1.0

| Code | Language             | TTS Voice         |
| ---- | -------------------- | ----------------- |
| `fr` | French               | edge-tts (neural) |
| `en` | English              | edge-tts (neural) |
| `ar` | العربية — Arabic        | edge-tts (neural) |
| `ha` | Hausa                | MMS-TTS (offline) |
| `ff` | Fulfulde / Fulfuldé  | MMS-TTS (offline) |
| `sw` | Kiswahili            | edge-tts (neural) |
| `pt` | Português            | edge-tts (neural) |
| `wo` | Wolof                | espeak-ng         |
| `am` | አማርኛ — Amharic       | edge-tts (neural) |
| `bm` | Bamanankan — Bambara | MMS-TTS (offline) |

---

## Features

- **Real-time speech translation** — speech → text → translation → speech, end-to-end
- **Automatic spoken language detection** — no setup required
- **Independent volume** — original and translated voices adjustable separately
- **WebRTC video conferencing** — camera, microphone, screen sharing
- **Meeting controls** — raise hand, emoji reactions, chat, recording
- **Background blur** via AI segmentation
- **No account required** — join a room instantly
- **No account required** — join a room instantly with a code
- **Data sovereignty** — 100% self-hosted, open source, no third-party cloud
- **Multi-device** — desktop, tablet, mobile
- **Desktop app** Electron (Windows, macOS, Linux)

---

## Quick Start

```bash
# Copy and configure the environment
cp .env.example .env
# Edit .env: add SECRET_KEY, RESEND_API_KEY (or SMTP), etc.

# Start all services
docker compose up -d

# Access the application
# HTTP: http://localhost:3000
# HTTPS: https://localhost:3443  (self-signed certificate)
```

### Key Environment Variables

```env
SECRET_KEY=your-secret-key-here
AI_DEVICE=cpu                    # cpu | cuda | mps
WHISPER_MODEL=medium             # tiny | base | small | medium | large
RESEND_API_KEY=re_xxx            # Email via Resend (free, 3k/month)
APP_URL=http://localhost:3000
```

---

## Future Work — Sara Family & African Languages

### Background — Sara Family (Chad)

The Sara family is a group of Nilo-Saharan languages spoken mainly in southern Chad and northern CAR, with approximately **3 million speakers**. It is the most widely spoken language family in Chad — and one of the least represented in current digital tools.

### 16 Target Sara Dialects

| #   | Dialect     | Speaker | Zone                     |
| --- | ------------ | --------- | ------------------------ |
| 1 | **Ngambay** | ~900,000 | Mandoul, Eastern Logone |
| 2 | Mbay | ~200,000 | Middle Chari |
| 3 | Gor | ~150,000 | Tandjilé |
| 4 | Kaba | ~120,000 | Middle Chari |
| 5 | Laka | ~100,000 | Western Logone |
| 6 | Gulay | ~80,000 | Western Logone |
| 7 | Moïssala | ~70,000 | Mandoul |
| 8 | Morom | ~60,000 | Mandoul |
| 9 | Ngama | ~50,000 | Middle Chari |
| 10 | Bedjond | ~40,000 | Mandoul |
| 11 | Dagba | ~35,000 | Tandjilé |
| 12 | Daye | ~30,000 | Eastern Logone |
| 13 | Mbaye | ~30,000 | Middle Chari |
| 14 | Sara Dinga | ~25,000 | Mandoul |
| 15 | Ngambay-Sara | ~20,000 | Eastern Logone |
| 16 | Kyabé | ~15,000 | Mandoul |

### Phased Implementation Plan

**Phase 1 — Data Collection** *(in progress)*
- Recording of audio corpora with native speakers (partnerships with Chadian universities)
- Manual transcription by native speakers
- Goal: 10 hours of transcribed audio per dialect (STT), 2 hours per dialect (TTS)

**Phase 2 — Sara STT**
- Fine-tuning Whisper on the collected Sara corpora
- Base: `whisper-small` or `whisper-medium`
- ISO 639-3 codes: `ngy` (Ngambay), `myb` (Mbay)...
- Publication: `abdel-aziz-harane/whisper-sara-ngambay` on HuggingFace Hub

**Phase 3 — Sara Translation**
- SeamlessM4T does not cover Sara languages → pivot approach
- **French as pivot language**: Sara → French → Target language
- Fine-tuning NLLB-200 or lightweight seq2seq model for Sara ↔ French

**Phase 4 — Sara TTS**
- Training of VITS models (Meta MMS-TTS) by dialect
- Required corpus: ~2–4 hours of clean audio, 1–2 speakers per dialect
- Framework: Coqui TTS or MMS fine-tuning

**Phase 5 — Other Priority African Languages**

| Language      | Speakers | Region               | Resources               |
| ------------- | -------- | -------------------- | ----------------------- |
| Lingala       | 70M      | Congo, DRC           | Several corpora         |
| Yoruba        | 50M      | Nigeria, Benin       | Common Voice, Masakhane |
| Igbo          | 45M      | Nigeria              | Common Voice, Masakhane |
| Zarma/Djerma  | 4M       | Niger                | Limited                 |
| Moore (Mossi) | 8M       | Burkina Faso         | Common Voice            |
| Dioula        | 12M      | Ivory Coast, Burkina | Limited                 |
| Fon           | 2M       | Benin                | Masakhane               |
| Kirundi       | 9M       | Burundi, Rwanda      | Common Voice            |
| Twi           | 9M       | Ghana                | Masakhane               |
| Somali        | 22M      | Somalia, Ethiopia    | A few corpora           |

### Target Architecture — v2.0

```
stt.py
  ├─ whisper-african-sara    (16 fine-tuned Sara dialects)
  ├─ whisper-west-african    (Yoruba, Igbo, Twi, Fon...)
  └─ whisper-medium          (languages already covered)

translation.py
  ├─ SeamlessM4T v2          (languages covered)
  ├─ NLLB-200                (additional African languages)
  └─ Sara pivot model        (Sara ↔ French)

tts.py  [Extended Tier 2]
  ├─ MMS-TTS sara/ngambay/
  ├─ MMS-TTS sara/mbay/
  └─ ...
```

---

## Project Structure

```
kalamAI/
├── frontend/          React + TypeScript (UI, WebRTC, audio translation)
├── backend/           FastAPI (auth, rooms, WebSocket signaling)
├── ai-pipeline/       FastAPI (STT → Translation → TTS)
│   └── app/services/
│       ├── stt.py          faster-whisper
│       ├── translation.py  SeamlessM4T
│       ├── tts.py          HybridTTS (edge-tts / MMS / espeak)
│       └── orchestrator.py pipeline coordinator
├── electron/          Desktop application
├── models/            HuggingFace cache (Docker container)
└── docker-compose.yml 4 services: Redis, Backend, AI-Pipeline, Frontend
```

---

## License

MIT — Free to use, modify, and distribute.
