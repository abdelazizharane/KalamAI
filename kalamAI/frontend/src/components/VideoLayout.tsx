import { useState } from "react";
import type { PeerState } from "../hooks/useWebRTC";
import VideoTile from "./VideoTile";
import { useRoomStore } from "../store/roomStore";
import clsx from "clsx";

interface LocalInfo {
  id: string;
  name: string;
  stream: MediaStream | null;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

interface Props {
  local: LocalInfo;
  peers: PeerState[];
  raisedHands: Record<string, boolean>;
  error: string | null;
}

interface Participant {
  id: string;
  name: string;
  stream: MediaStream | null;
  isLocal: boolean;
  micOn: boolean;
  camOn: boolean;
  isHandRaised: boolean;
  isScreenSharing: boolean;
}

/**
 * Displays an error state prompting the user to grant camera/microphone permissions.
 */
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6"
      style={{ background: "radial-gradient(ellipse at center, #1a0a0a 0%, #090e1a 100%)" }}>
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-red-400 font-medium mb-2">{error}</p>
        <p className="text-xs text-gray-500 max-w-xs">
          Allow access to your camera and microphone in your browser settings, then reload.
        </p>
      </div>
      <button onClick={() => window.location.reload()}
        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-violet-400 transition-colors border border-white/10">
        Retry
      </button>
    </div>
  );
}

/**
 * Orchestrates all video layout modes: solo, two-person split, spotlight+thumbnails,
 * and screen-share zoom layout. Supports pinning a participant to the spotlight.
 */
export default function VideoLayout({ local, peers, raisedHands, error }: Props) {
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const originalVolume = useRoomStore((s) => s.originalVolume);
  const peerVolume = originalVolume / 100;

  if (error) return <ErrorDisplay error={error} />;

  const all: Participant[] = [
    {
      id: local.id, name: local.name, stream: local.stream,
      isLocal: true, micOn: local.isMicOn, camOn: local.isCamOn,
      isHandRaised: local.isHandRaised, isScreenSharing: local.isScreenSharing,
    },
    ...peers.map((p) => ({
      id: p.id, name: p.name, stream: p.stream,
      isLocal: false, micOn: p.micOn, camOn: p.camOn,
      isHandRaised: raisedHands[p.id] ?? false, isScreenSharing: p.isScreenSharing,
    })),
  ];

  // ── Screen share active: Zoom-style layout ──────────────────────────────
  const sharingParticipant = all.find((p) => p.isScreenSharing);
  if (sharingParticipant) {
    const others = all.filter((p) => p.id !== sharingParticipant.id);
    return (
      <div className="w-full h-full flex gap-1.5 p-1.5">
        {/* Main: shared screen */}
        <div className="flex-1 min-w-0">
          <VideoTile
            stream={sharingParticipant.stream}
            name={sharingParticipant.name}
            isLocal={sharingParticipant.isLocal}
            isMuted={!sharingParticipant.micOn}
            isVideoOff={false}
            isScreenSharing
            isSpotlight
            volume={peerVolume}
          />
        </div>
        {/* Right: participant strip */}
        {others.length > 0 && (
          <div className="flex flex-col gap-1.5 w-44 sm:w-52 shrink-0 overflow-y-auto scrollbar-hide">
            {others.map((p) => (
              <div key={p.id} className="aspect-video w-full rounded-xl overflow-hidden shrink-0">
                <VideoTile
                  stream={p.stream} name={p.name} isLocal={p.isLocal}
                  isMuted={!p.micOn} isVideoOff={!p.camOn}
                  isHandRaised={p.isHandRaised} compact volume={peerVolume}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Solo view ───────────────────────────────────────────────────────────
  if (all.length === 1) {
    return (
      <div className="w-full h-full p-2">
        <VideoTile
          stream={local.stream} name={local.name} isLocal
          isMuted={!local.isMicOn} isVideoOff={!local.isCamOn}
          isScreenSharing={local.isScreenSharing} isHandRaised={local.isHandRaised}
          isSpotlight
        />
      </div>
    );
  }

  // ── 2-person: equal split ───────────────────────────────────────────────
  if (all.length === 2 && !pinnedId) {
    return (
      <div className="w-full h-full grid grid-cols-2 gap-1.5 p-1.5">
        {all.map((p) => (
          <div key={p.id} onClick={() => setPinnedId(p.id)}
            className="cursor-pointer rounded-2xl overflow-hidden">
            <VideoTile
              stream={p.stream} name={p.name} isLocal={p.isLocal}
              isMuted={!p.micOn} isVideoOff={!p.camOn}
              isScreenSharing={p.isScreenSharing} isHandRaised={p.isHandRaised}
              isSpotlight volume={peerVolume}
            />
          </div>
        ))}
      </div>
    );
  }

  // ── 3+ people: spotlight + thumbnail strip ──────────────────────────────
  const pinned = pinnedId ? all.find((p) => p.id === pinnedId) : null;
  const defaultSpotlight = peers.length > 0 ? all[1] : all[0];
  const spotlight = pinned ?? defaultSpotlight;
  const thumbnails = all.filter((p) => p.id !== spotlight.id);

  return (
    <div className="flex flex-col h-full gap-1.5 p-1.5">
      {/* Spotlight */}
      <div className="flex-1 min-h-0 relative">
        <VideoTile
          stream={spotlight.stream} name={spotlight.name} isLocal={spotlight.isLocal}
          isMuted={!spotlight.micOn} isVideoOff={!spotlight.camOn}
          isScreenSharing={spotlight.isScreenSharing} isHandRaised={spotlight.isHandRaised}
          isPinned={!!pinnedId} isSpotlight volume={peerVolume}
        />
        {pinnedId && (
          <button
            onClick={() => setPinnedId(null)}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-xs text-white hover:bg-black/80 transition-all border border-white/10"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Unpin
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0 h-24 sm:h-32 pb-0.5">
        {thumbnails.map((p) => (
          <div
            key={p.id}
            onClick={() => setPinnedId((prev) => (prev === p.id ? null : p.id))}
            title={`Pin ${p.name}`}
            className={clsx(
              "h-full aspect-video shrink-0 rounded-xl overflow-hidden cursor-pointer",
              "transition-all duration-200 hover:scale-[1.03] hover:ring-2 hover:ring-white/20",
              pinnedId === p.id && "ring-2 ring-violet-500/80"
            )}
          >
            <VideoTile
              stream={p.stream} name={p.name} isLocal={p.isLocal}
              isMuted={!p.micOn} isVideoOff={!p.camOn}
              isHandRaised={p.isHandRaised} compact volume={peerVolume}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
