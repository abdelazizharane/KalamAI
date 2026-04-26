import { useEffect, useRef } from "react";
import clsx from "clsx";

interface Props {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  isPinned?: boolean;
  isSpotlight?: boolean;
  compact?: boolean;
  volume?: number; // 0–1, applied to peer <video> elements
}

/**
 * Renders a single participant's video tile.
 * Falls back to an avatar when camera is off or stream is unavailable.
 * Uses object-contain for screen shares to avoid cropping shared content.
 */
export default function VideoTile({
  stream, name, isLocal = false, isMuted = false,
  isVideoOff = false, isScreenSharing = false,
  isHandRaised = false, isPinned = false,
  isSpotlight = false, compact = false, volume = 1,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) video.play().catch(() => {});
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isLocal) return;
    video.volume = Math.max(0, Math.min(1, volume));
  }, [volume, isLocal]);

  const initials = name.trim().charAt(0).toUpperCase() || "?";
  const hasVideo = !!stream && !isVideoOff;

  return (
    <div className={clsx(
      "relative w-full h-full flex items-center justify-center overflow-hidden",
      "bg-[#090e1a] transition-all duration-300",
      isSpotlight ? "rounded-2xl" : "rounded-xl",
      isHandRaised && "ring-2 ring-amber-400/60",
      isPinned && "ring-2 ring-cyan-500/70",
      !isHandRaised && !isPinned && "ring-1 ring-white/[0.06]",
    )}>
      {/* Video element — object-contain for screen shares, object-cover for cameras */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={clsx(
          "w-full h-full",
          isScreenSharing ? "object-contain bg-black" : "object-cover"
        )}
        style={{
          transform: isLocal && !isScreenSharing ? "scaleX(-1)" : undefined,
          display: hasVideo ? "block" : "none",
        }}
      />

      {/* Avatar placeholder when video is unavailable */}
      {!hasVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "radial-gradient(ellipse at center, #0f1a2e 0%, #090e1a 100%)" }}>
          <div className={clsx(
            "rounded-full flex items-center justify-center",
            "border border-white/10 shadow-lg",
            compact ? "w-10 h-10" : isSpotlight ? "w-24 h-24 sm:w-32 sm:h-32" : "w-12 h-12"
          )}
            style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.25))" }}>
            <span className={clsx(
              "font-bold text-white",
              compact ? "text-sm" : isSpotlight ? "text-3xl sm:text-4xl" : "text-lg"
            )}>
              {initials}
            </span>
          </div>
          {!compact && <span className="text-sm text-gray-400">{name}</span>}
        </div>
      )}

      {/* Depth gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.5) 100%)" }} />

      {/* Top-right status badges */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {isHandRaised && (
          <span className={clsx(
            "flex items-center justify-center rounded-full",
            "bg-amber-500/90 backdrop-blur-sm border border-amber-400/30 animate-bounce",
            compact ? "w-5 h-5 text-xs" : "w-7 h-7 text-base"
          )}>✋</span>
        )}
        {isScreenSharing && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-600/90 backdrop-blur-sm border border-cyan-400/30 text-white text-[10px] font-medium">
            🖥️ {compact ? "" : "Sharing"}
          </span>
        )}
        {isPinned && !compact && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px]">📌</span>
        )}
      </div>

      {/* Bottom name + mute indicator */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2 py-1.5"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
        <span className={clsx(
          "font-medium text-white truncate flex-1",
          compact ? "text-[10px]" : "text-xs sm:text-sm"
        )}>
          {isLocal ? `${compact ? name : `${name} (you)`}` : name}
        </span>
        {isMuted && (
          <span className="shrink-0 w-5 h-5 rounded-full bg-red-500/90 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4M3 3l18 18" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
