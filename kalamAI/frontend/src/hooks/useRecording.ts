import { useRef, useState, useCallback, useEffect } from "react";

/**
 * Full-screen meeting recorder — captures exactly like Teams, Zoom, Google Meet.
 *
 * When the user clicks REC, the native browser picker appears letting them choose:
 *   • Entire Screen  — records the full desktop (recommended)
 *   • Window         — records a single application window
 *   • Browser Tab    — records only this tab
 *
 * Microphone audio is captured separately and mixed in so both sides of the
 * conversation are included in the recording.
 */
export function useRecording() {
  const [isRecording, setIsRecording]       = useState(false);
  const [seconds, setSeconds]               = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isRecording) {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const _start = useCallback((stream: MediaStream) => {
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: mime });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `kalamai-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    };
    mr.start(1000);
    recorderRef.current = mr;
    setIsRecording(true);
    setRecordingError(null);
  }, []);

  const startRecording = useCallback(async () => {
    setRecordingError(null);
    try {
      // Open the full screen/window/tab picker — same as Teams, Zoom, Meet.
      // No constraints that force tab capture: the user picks what to record.
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,           // captures system / tab audio when available
      });

      // Mix microphone audio in separately (local speaker voice)
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch { /* microphone is optional */ }

      const displayAudio = displayStream.getAudioTracks();
      let finalAudio: MediaStreamTrack[] = displayAudio;

      if (micStream) {
        try {
          const ctx  = new AudioContext();
          audioCtxRef.current = ctx;
          const dest = ctx.createMediaStreamDestination();
          if (displayAudio.length > 0) {
            ctx.createMediaStreamSource(new MediaStream(displayAudio)).connect(dest);
          }
          ctx.createMediaStreamSource(micStream).connect(dest);
          finalAudio = dest.stream.getAudioTracks();
        } catch { /* fall back to display audio only */ }
      }

      const combined = new MediaStream([
        ...displayStream.getVideoTracks(),
        ...finalAudio,
      ]);

      _start(combined);

      // Auto-stop when user closes the browser's "Stop sharing" bar
      displayStream.getVideoTracks()[0].onended = () => {
        recorderRef.current?.stop();
        recorderRef.current = null;
        setIsRecording(false);
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NotAllowedError") || msg.includes("Permission denied")) {
        setRecordingError("Recording cancelled — screen sharing permission was denied.");
      } else if (msg.includes("NotSupportedError")) {
        setRecordingError("Screen recording not supported. Please use Chrome or Edge.");
      } else {
        setRecordingError(`Recording failed: ${msg}`);
      }
    }
  }, [_start]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, toggleRecording, recordingTime: formatTime(seconds), recordingError };
}
