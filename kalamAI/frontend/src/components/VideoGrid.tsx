import type { PeerState } from "../hooks/useWebRTC";
import VideoTile from "./VideoTile";

interface Props {
  localStream: MediaStream | null;
  localName: string;
  isMicOn: boolean;
  isCamOn: boolean;
  isScreenSharing: boolean;
  peers: PeerState[];
  error: string | null;
}

function gridCols(total: number): string {
  if (total === 1) return "grid-cols-1";
  if (total === 2) return "grid-cols-2";
  if (total <= 4) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}

function gridRows(total: number): string {
  if (total <= 2) return "grid-rows-1";
  if (total <= 4) return "grid-rows-2";
  return "grid-rows-3";
}

export default function VideoGrid({
  localStream, localName, isMicOn, isCamOn, isScreenSharing, peers, error,
}: Props) {
  const total = 1 + peers.length;

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#1a1d27] rounded-xl p-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-red-400 font-medium mb-2">{error}</p>
          <p className="text-xs text-gray-500 max-w-xs">
            Cliquez sur le cadenas dans la barre d'adresse du navigateur pour autoriser la caméra et le microphone, puis rechargez la page.
          </p>
        </div>
        <button onClick={() => window.location.reload()}
          className="text-sm text-accent hover:underline">
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full h-full grid gap-1.5 p-1.5 ${gridCols(total)} ${gridRows(total)}`}>
      <VideoTile
        stream={localStream}
        name={localName}
        isLocal
        isMuted={!isMicOn}
        isVideoOff={!isCamOn}
        isScreenSharing={isScreenSharing}
      />
      {peers.map((peer) => (
        <VideoTile
          key={peer.id}
          stream={peer.stream}
          name={peer.name}
          isMuted={!peer.micOn}
          isVideoOff={!peer.camOn}
        />
      ))}
    </div>
  );
}
