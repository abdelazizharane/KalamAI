import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "../store/roomStore";

interface Props {
  roomCode: string;
  displayName: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: object) => {
      dispose: () => void;
      executeCommand: (cmd: string, ...args: unknown[]) => void;
    };
  }
}

const JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN ?? "meet.jit.si";

export default function JitsiFrame({ roomCode, displayName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<InstanceType<typeof window.JitsiMeetExternalAPI> | null>(null);
  const { isMicOn, isCamOn } = useRoomStore();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = `https://${JITSI_DOMAIN}/external_api.js`;
    script.async = true;

    script.onload = () => {
      if (!containerRef.current || !window.JitsiMeetExternalAPI) {
        setStatus("error");
        return;
      }
      try {
        apiRef.current = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: `kalamai-${roomCode}`,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: {
            startWithAudioMuted: !isMicOn,
            startWithVideoMuted: !isCamOn,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            toolbarButtons: [
              "camera", "chat", "hangup", "microphone",
              "participants-pane", "raisehand", "settings",
              "tileview", "toggle-camera", "videoquality",
            ],
            defaultLocalDisplayName: displayName,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: "#0f1117",
            TOOLBAR_ALWAYS_VISIBLE: false,
          },
        });
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    };

    script.onerror = () => setStatus("error");
    document.head.appendChild(script);

    return () => {
      apiRef.current?.dispose();
      apiRef.current = null;
      if (document.head.contains(script)) document.head.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, displayName]);

  useEffect(() => {
    apiRef.current?.executeCommand("toggleAudio");
  }, [isMicOn]);

  useEffect(() => {
    apiRef.current?.executeCommand("toggleVideo");
  }, [isCamOn]);

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1117] rounded-2xl z-10">
          <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm text-muted">Connexion à la réunion…</p>
          <p className="text-xs text-muted/50 mt-1">via {JITSI_DOMAIN}</p>
        </div>
      )}

      {/* Error overlay */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f1117] rounded-2xl z-10 gap-3">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-400 font-medium">Impossible de charger la vidéo</p>
          <p className="text-xs text-muted text-center max-w-xs">
            Vérifiez votre connexion internet et les permissions caméra/micro du navigateur.
          </p>
          <button
            onClick={() => { setStatus("loading"); window.location.reload(); }}
            className="text-xs text-accent hover:underline mt-1"
          >
            Réessayer
          </button>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden" />
    </div>
  );
}
