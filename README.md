# KalamAI - Visioconference 
A video conferencing platform with real-time audio translation powered by Claude Opus 4.7, designed for African and international institutions.

## 🚀 Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/votre-username/kalamAI
cd kalamAI

# 2. Environment variables
cp .env.example .env
echo “ANTHROPIC_API_KEY=sk-ant-...” >> .env

# 3. Start everything
docker compose up --build
```

Frontend: http://localhost:3000  
API: http://localhost:8000  
API Docs: http://localhost:8000/docs  

## 🧠 Architecture

```
French speech  →  faster-whisper (STT)
           →  Claude Opus 4.7 (translation)
           →  CosyVoice3-0.5B (TTS 150ms) — FR/EN/ES/DE/IT/RU
           →  Fish Speech V1.5 (TTS ~200ms) — AR/HA/SW + 77 others
```

### 4 Claude Opus 4.7 Agents

| Agent | Role | Frequency |
|---|---|---|
| **Translation** | Translates each segment in real time | Continuous |
| **Summary** | Structured summary of the meeting | Every 5 min |
| **Action Items** | Extracts decisions and commitments | Every 2 min |
| **Email** | Drafts the post-meeting follow-up | End of meeting |

### Supported Languages

| Language | ASR (speech-to-text) | TTS (text-to-speech) |
|---|---|---|
| French | ✅ Whisper | ✅ CosyVoice3 (150ms) |
| English | ✅ Whisper | ✅ CosyVoice3 (150ms) |
| Standard Arabic | ✅ Whisper | ✅ Fish Speech (~200ms) |
| Spanish | ✅ Whisper | ✅ CosyVoice3 (150ms) |
| Hausa | ⚠️ Partial Whisper | ✅ Fish Speech |
| Swahili | ⚠️ Partial Whisper | ✅ Fish Speech |
| **Chadian Arabic (Shu)** | ⚠️ Via Standard Arabic | 🔶 Fish Speech + glossary |
| **Sara (Ngambay)** | 🔶 Auto-detection | 🔶 Fish Speech + glossary |

## 📁 Structure

```
kalamAI/
├── backend/
│   ├── main.py                    # FastAPI app
│   ├── services/
│   │   ├── stt_service.py         # faster-whisper
│   │   ├── tts_service.py         # CosyVoice3 + Fish Speech
│   │   └── translation_service.py # Claude Opus 4.7
│   ├── agents/
│   │   └── meeting_agents.py      # 4 Claude agents
│   ├── routers/
│   │   ├── audio_ws.py            # WebSocket pipeline
│   │   └── meeting.py             # Meetings REST API
│   └── glossaries/
│       ├── glossary_sara.json     # ~70 Sara (Ngambay) terms
│       └── glossary_shu.json      # ~70 Chadian Arabic terms
├── frontend/                      # React + Jitsi SDK
├── docker-compose.yml
└── README.md
```

## Technical Stack

- **Video**: Jitsi Meet (iFrame API)
- **STT**: faster-whisper large-v3 (GPU)
- **Translation**: Claude Opus 4.7 (streaming)
- **Main TTS**: Fun-CosyVoice3-0.5B (150ms, MIT)
- **Multilingual TTS**: Fish Speech V1.5 (~200ms, 80+ languages)
- **Backend**: FastAPI + WebSockets
- **Cache**: Redis
- **Frontend**: React
- **Deploy**: Docker Compose

## 📜 License

MIT — fully open source.

---
*Built for the Anthropic Hackathon 2026 — “Built with Opus 4.7”*
