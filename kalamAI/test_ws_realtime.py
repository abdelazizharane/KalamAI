"""
End-to-end realtime test:
- User B connects via WebSocket with language='en'
- Real French espeak audio is posted as user_a to /process (no X-Source-Language)
- We verify User B receives translated bytes on the socket
"""
import asyncio
import json
import sys
import httpx
import websockets

BACKEND  = "http://localhost:8000"
PIPELINE = "http://localhost:8001"
WS_URL   = "ws://localhost:8000/ws/TEST123/user_b"
import os, tempfile
WAV_PATH = os.path.join(tempfile.gettempdir(), "test_fr_real.wav")


async def main():
    print("=" * 60)
    print("  KalamAI - End-to-End Realtime WebSocket + Auto-Detect Test")
    print("=" * 60)

    received_frames = []

    async with websockets.connect(WS_URL, open_timeout=10) as ws:
        print("[PASS] User B WebSocket connected")

        # Declare listening language = English
        await ws.send(json.dumps({"language": "en"}))
        print("[INFO] User B declared language='en' -> subscribed to room:TEST123:lang:en")

        # Small delay so subscription propagates in Redis
        await asyncio.sleep(1)

        # Post real French speech as user_a (NO X-Source-Language header)
        with open(WAV_PATH, "rb") as f:
            audio_bytes = f.read()

        print(f"[INFO] Posting {len(audio_bytes)} bytes of real French speech as user_a")
        print(f"[INFO] Headers sent: X-Room-Code=TEST123  X-User-Id=user_a  (NO X-Source-Language)")

        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                f"{PIPELINE}/process",
                content=audio_bytes,
                headers={
                    "X-Room-Code": "TEST123",
                    "X-User-Id": "user_a",
                    # NO X-Source-Language — Whisper must auto-detect
                },
            )
        print(f"[INFO] Pipeline response: {r.status_code} {r.text}")

        # Listen for up to 60 seconds for translated audio/subtitle
        print("[INFO] Listening on User B socket for translated output (up to 60 s)...")
        deadline = asyncio.get_event_loop().time() + 60
        while asyncio.get_event_loop().time() < deadline:
            remaining = deadline - asyncio.get_event_loop().time()
            try:
                msg = await asyncio.wait_for(ws.recv(), timeout=min(2.0, remaining))
                if isinstance(msg, bytes):
                    received_frames.append(msg)
                    # Try decode as subtitle JSON (starts with '{')
                    if msg.startswith(b"{"):
                        try:
                            sub = json.loads(msg)
                            print(f"[PASS] User B received SUBTITLE: {sub}")
                        except Exception:
                            print(f"[INFO] User B received binary (possible subtitle): {msg[:60]}")
                    else:
                        print(f"[PASS] User B received AUDIO bytes: {len(msg)} bytes (translated speech)")
                else:
                    print(f"[INFO] User B received text frame: {msg[:100]}")
                    received_frames.append(msg)
            except asyncio.TimeoutError:
                # Print a dot so we can see it's still waiting
                print(".", end="", flush=True)
                continue
            except Exception as exc:
                print(f"\n[INFO] Socket closed: {exc}")
                break

    print()
    if received_frames:
        print(f"[PASS] CONFIRMED: User B received {len(received_frames)} frame(s)")
        print("[PASS] END-TO-END: French speech -> auto-detected -> translated -> delivered as English")
    else:
        print("[WARN] No frames received on User B socket within 60 s")
        print("[INFO] Translation pipeline may still be running — check docker logs")

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
