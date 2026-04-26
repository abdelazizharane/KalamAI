import type { PeerState } from "../hooks/useWebRTC";
import clsx from "clsx";

interface Props {
  localName: string;
  isMicOn: boolean;
  isCamOn: boolean;
  isHandRaised?: boolean;
  peers: PeerState[];
  raisedHands?: Record<string, boolean>;
  isHost: boolean;
  onMutePeer: (id: string) => void;
  onCamOffPeer: (id: string) => void;
  onKickPeer: (id: string) => void;
  onClose: () => void;
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-violet-500/20"
      style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.25))" }}>
      <span className="text-sm font-bold text-violet-300">
        {name.trim().charAt(0).toUpperCase() || "?"}
      </span>
    </div>
  );
}

function MicBadge({ on }: { on: boolean }) {
  return on ? (
    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 10V5a3 3 0 00-3-3m0 0a3 3 0 00-3 3v6M3 3l18 18" />
    </svg>
  );
}

function CamBadge({ on }: { on: boolean }) {
  return on ? (
    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
    </svg>
  );
}

export default function ParticipantsPanel({
  localName, isMicOn, isCamOn, isHandRaised = false,
  peers, raisedHands = {}, isHost, onMutePeer, onCamOffPeer, onKickPeer, onClose,
}: Props) {
  const total = 1 + peers.length;

  return (
    <div className="flex flex-col h-full border-l border-white/5"
      style={{ background: "rgba(13,17,30,0.98)", backdropFilter: "blur(24px)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-gray-200">Participants</span>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{total}</span>
          {isHost && (
            <span className="text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
              Hôte
            </span>
          )}
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">

        {/* Local user */}
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
          <Avatar name={localName} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-100 truncate">{localName}</p>
              {isHandRaised && <span className="text-sm animate-bounce" title="Main levée">✋</span>}
            </div>
            <p className="text-xs text-violet-400">Vous{isHost ? " · Hôte" : ""}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <MicBadge on={isMicOn} />
            <CamBadge on={isCamOn} />
          </div>
        </div>

        {peers.length > 0 && (
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-2 pt-2 pb-0.5">
            Dans la salle
          </p>
        )}

        {peers.map((peer) => {
          const peerRaisedHand = raisedHands[peer.id] ?? false;
          return (
            <div key={peer.id}
              className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
              <Avatar name={peer.name} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-gray-100 truncate">{peer.name}</p>
                  {peerRaisedHand && <span className="text-sm animate-bounce" title="Main levée">✋</span>}
                </div>
                <p className={clsx("text-xs", peer.stream ? "text-green-400" : "text-gray-500")}>
                  {peer.stream ? "Connecté" : "Connexion…"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <MicBadge on={peer.micOn} />
                <CamBadge on={peer.camOn} />
              </div>

              {/* Host controls — always visible when host */}
              {isHost && (
                <div className="flex items-center gap-1 ml-1 shrink-0">
                  <button
                    onClick={() => onMutePeer(peer.id)}
                    title="Couper le micro"
                    className="w-6 h-6 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 10V5a3 3 0 00-3-3m0 0a3 3 0 00-3 3v6M3 3l18 18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onCamOffPeer(peer.id)}
                    title="Couper la caméra"
                    className="w-6 h-6 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onKickPeer(peer.id)}
                    title="Exclure de la réunion"
                    className="w-6 h-6 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
