import { useEffect, useRef, useCallback } from "react";
import { useRoomStore } from "../store/roomStore";

// Derive WebSocket URL from current page host — works on any device/IP
function getWsBase() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}`;
}

export function useTranslation(roomCode: string, userId: string) {
  const { listeningLanguage, isMicOn, setTranslating, translationVolume } = useRoomStore();

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // First MediaRecorder chunk contains the WebM EBML header + track metadata.
  // Subsequent chunks are bare clusters — invalid as standalone files.
  // We prepend the header to every chunk so the pipeline always receives a valid WebM.
  const webmHeaderRef = useRef<Blob | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      gainRef.current = audioCtxRef.current.createGain();
      gainRef.current.connect(audioCtxRef.current.destination);
    }
    return { ctx: audioCtxRef.current, gain: gainRef.current! };
  }, []);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = translationVolume / 100;
  }, [translationVolume]);

  useEffect(() => {
    if (!roomCode || !userId) return;
    const ws = new WebSocket(`${getWsBase()}/ws/${roomCode}/${userId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ language: listeningLanguage }));
      setTranslating(true);
    };

    ws.onmessage = async (event: MessageEvent) => {
      if (!(event.data instanceof Blob)) return;

      const { ctx, gain } = getAudioCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const buf = await event.data.arrayBuffer();
      try {
        const decoded = await ctx.decodeAudioData(buf);
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        src.connect(gain);
        src.start();
      } catch { /* ignore malformed chunks */ }
    };

    ws.onclose = () => setTranslating(false);
    ws.onerror = () => setTranslating(false);

    return () => { ws.close(); setTranslating(false); };
  }, [roomCode, userId, listeningLanguage, getAudioCtx, setTranslating]);

  useEffect(() => {
    if (!isMicOn) {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      streamRef.current = null;
      return;
    }

    webmHeaderRef.current = null; // reset header on each new recorder session
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        streamRef.current = stream;
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "";
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size === 0) return;
          if (!webmHeaderRef.current) {
            // First chunk — save it as the header blob (contains EBML + Tracks)
            webmHeaderRef.current = e.data;
          }
          // Build a self-contained WebM: header + this cluster
          const payload =
            webmHeaderRef.current === e.data
              ? e.data
              : new Blob([webmHeaderRef.current, e.data], { type: "audio/webm" });
          if (wsRef.current?.readyState === WebSocket.OPEN)
            wsRef.current.send(payload);
        };
        recorder.start(3000);
      })
      .catch(() => useRoomStore.getState().toggleMic());

    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isMicOn]);
}
