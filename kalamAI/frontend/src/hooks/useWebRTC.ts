import { useEffect, useRef, useState, useCallback } from "react";
import { useRoomStore } from "../store/roomStore";

export interface PeerState {
  id: string;
  name: string;
  stream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  isScreenSharing: boolean;
}

export interface ChatMessage {
  id: string;
  from: string;
  name: string;
  text: string;
  ts: number;
  isLocal: boolean;
}

export interface Reaction {
  id: string;
  from: string;
  name: string;
  emoji: string;
  ts: number;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.services.mozilla.com" },
];

function signalUrl(roomCode: string, userId: string) {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/signal/${roomCode}/${userId}`;
}

export function useWebRTC(
  roomCode: string,
  userId: string,
  displayName: string,
  onKicked: () => void,
) {
  const { isMicOn, isCamOn } = useRoomStore();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<PeerState[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Record<string, boolean>>({});
  const [isHandRaised, setIsHandRaised] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIce = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const savedCamTrackRef = useRef<MediaStreamTrack | null>(null);
  const onKickedRef = useRef(onKicked);
  onKickedRef.current = onKicked;

  // ── Peer connection factory ──────────────────────────────────────────────
  const createPc = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    localStreamRef.current?.getTracks().forEach((t) =>
      pc.addTrack(t, localStreamRef.current!)
    );

    pc.ontrack = ({ streams }) => {
      setPeers((prev) =>
        prev.map((p) => (p.id === peerId ? { ...p, stream: streams[0] ?? null } : p))
      );
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ice-candidate", to: peerId, candidate }));
      }
    };

    pcsRef.current.set(peerId, pc);
    return pc;
  }, []);

  // ── Broadcast current media state to all peers ───────────────────────────
  const broadcastMediaState = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    const { isMicOn: m, isCamOn: c } = useRoomStore.getState();
    wsRef.current.send(JSON.stringify({ type: "media-state", micOn: m, camOn: c }));
  }, []);

  // ── Message handler ──────────────────────────────────────────────────────
  const handleMsg = useCallback(
    async (raw: string) => {
      const msg: Record<string, unknown> = JSON.parse(raw);

      if (msg.type === "peers") {
        for (const peer of (msg.peers as { id: string; name: string }[])) {
          setPeers((prev) =>
            prev.find((p) => p.id === peer.id)
              ? prev
              : [...prev, { id: peer.id, name: peer.name, stream: null, micOn: true, camOn: true, isScreenSharing: false }]
          );
          const pc = createPc(peer.id);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          wsRef.current?.send(JSON.stringify({ type: "offer", to: peer.id, sdp: offer }));
        }
        // Announce our media state to existing peers right after joining
        setTimeout(broadcastMediaState, 500);

      } else if (msg.type === "peer-joined") {
        const { from: id, name } = msg as { from: string; name: string };
        setPeers((prev) =>
          prev.find((p) => p.id === id)
            ? prev
            : [...prev, { id, name, stream: null, micOn: true, camOn: true, isScreenSharing: false }]
        );
        createPc(id);

      } else if (msg.type === "offer") {
        const { from, sdp } = msg as { from: string; sdp: RTCSessionDescriptionInit };
        let pc = pcsRef.current.get(from);
        if (!pc) {
          setPeers((prev) =>
            prev.find((p) => p.id === from)
              ? prev
              : [...prev, { id: from, name: from, stream: null, micOn: true, camOn: true, isScreenSharing: false }]
          );
          pc = createPc(from);
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        for (const c of pendingIce.current.get(from) ?? []) {
          try { await pc.addIceCandidate(c); } catch { /* ignore */ }
        }
        pendingIce.current.delete(from);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        wsRef.current?.send(JSON.stringify({ type: "answer", to: from, sdp: answer }));

      } else if (msg.type === "answer") {
        const { from, sdp } = msg as { from: string; sdp: RTCSessionDescriptionInit };
        const pc = pcsRef.current.get(from);
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      } else if (msg.type === "ice-candidate") {
        const { from, candidate } = msg as { from: string; candidate: RTCIceCandidateInit };
        const pc = pcsRef.current.get(from);
        if (pc?.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
        } else {
          const q = pendingIce.current.get(from) ?? [];
          q.push(candidate);
          pendingIce.current.set(from, q);
        }

      } else if (msg.type === "peer-left") {
        const { from } = msg as { from: string };
        pcsRef.current.get(from)?.close();
        pcsRef.current.delete(from);
        pendingIce.current.delete(from);
        setPeers((prev) => prev.filter((p) => p.id !== from));

      } else if (msg.type === "chat") {
        const { from, name, text, id } = msg as {
          from: string; name: string; text: string; id: string;
        };
        setChatMessages((prev) => [...prev, { id, from, name, text, ts: Date.now(), isLocal: false }]);

      } else if (msg.type === "reaction") {
        const { from, name, emoji, id } = msg as {
          from: string; name: string; emoji: string; id: string;
        };
        const r: Reaction = { id, from, name, emoji, ts: Date.now() };
        setReactions((prev) => [...prev, r]);
        setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== id)), 4000);

      } else if (msg.type === "media-state") {
        const { from, micOn, camOn } = msg as { from: string; micOn: boolean; camOn: boolean };
        setPeers((prev) =>
          prev.map((p) => (p.id === from ? { ...p, micOn, camOn } : p))
        );

      } else if (msg.type === "screen-share") {
        const { from, sharing } = msg as { from: string; sharing: boolean };
        setPeers((prev) =>
          prev.map((p) => (p.id === from ? { ...p, isScreenSharing: sharing } : p))
        );

      } else if (msg.type === "host-mute") {
        useRoomStore.getState().setMic(false);

      } else if (msg.type === "host-cam-off") {
        useRoomStore.getState().setCam(false);

      } else if (msg.type === "host-kick") {
        onKickedRef.current();
      } else if (msg.type === "raise-hand") {
        const { from, raised } = msg as { from: string; raised: boolean };
        setRaisedHands((prev) => ({ ...prev, [from]: raised }));
      }
    },
    [createPc, broadcastMediaState]
  );

  // ── Boot: acquire media → open signaling WS ──────────────────────────────
  useEffect(() => {
    if (!roomCode || !userId) return;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        stream.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });
        stream.getVideoTracks().forEach((t) => { t.enabled = isCamOn; });

        localStreamRef.current = stream;
        setLocalStream(stream);

        const ws = new WebSocket(signalUrl(roomCode, userId));
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "hello", name: displayName }));
        };
        ws.onmessage = (e) => { handleMsg(e.data).catch(console.error); };
        ws.onerror = () => setError("Connexion au serveur de signalisation échouée.");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.name === "NotAllowedError"
            ? "Accès refusé à la caméra/micro. Cliquez sur le cadenas dans la barre d'adresse."
            : "Impossible d'accéder à la caméra ou au microphone."
        );
      });

    return () => {
      cancelled = true;
      wsRef.current?.close();
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      pendingIce.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
      setPeers([]);
      setChatMessages([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, userId, displayName]);

  // ── Sync mic/cam toggles → tracks + broadcast ────────────────────────────
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });
    broadcastMediaState();
  }, [isMicOn, broadcastMediaState]);

  useEffect(() => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = isCamOn; });
    broadcastMediaState();
  }, [isCamOn, broadcastMediaState]);

  // ── Screen sharing ───────────────────────────────────────────────────────
  const stopScreenShare = useCallback(async () => {
    const camTrack = savedCamTrackRef.current;
    if (!camTrack) return;

    pcsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(camTrack);
    });

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        localStreamRef.current!.removeTrack(t);
        t.stop();
      });
      localStreamRef.current.addTrack(camTrack);
    }

    setLocalStream(new MediaStream(localStreamRef.current?.getTracks() ?? []));
    setIsScreenSharing(false);
    savedCamTrackRef.current = null;
    wsRef.current?.send(JSON.stringify({ type: "screen-share", sharing: false }));
  }, []);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: true,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Save current cam track
      savedCamTrackRef.current =
        localStreamRef.current?.getVideoTracks()[0] ?? null;

      // Replace track in all peer connections (no renegotiation needed)
      pcsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        sender?.replaceTrack(screenTrack);
      });

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) =>
          localStreamRef.current!.removeTrack(t)
        );
        localStreamRef.current.addTrack(screenTrack);
      }

      setLocalStream(new MediaStream(localStreamRef.current?.getTracks() ?? []));
      setIsScreenSharing(true);
      wsRef.current?.send(JSON.stringify({ type: "screen-share", sharing: true }));

      // User can stop via the browser's "Stop sharing" button
      screenTrack.onended = () => stopScreenShare();
    } catch {
      // User cancelled getDisplayMedia
    }
  }, [stopScreenShare]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) return stopScreenShare();
    return startScreenShare();
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  // ── Reactions ────────────────────────────────────────────────────────────
  const sendReaction = useCallback(
    (emoji: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      const id = crypto.randomUUID();
      wsRef.current.send(JSON.stringify({ type: "reaction", id, emoji }));
      const r: Reaction = { id, from: userId, name: displayName, emoji, ts: Date.now() };
      setReactions((prev) => [...prev, r]);
      setTimeout(() => setReactions((prev) => prev.filter((x) => x.id !== id)), 4000);
    },
    [userId, displayName]
  );

  // ── Chat ─────────────────────────────────────────────────────────────────
  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || wsRef.current?.readyState !== WebSocket.OPEN) return;
      const id = crypto.randomUUID();
      wsRef.current.send(JSON.stringify({ type: "chat", id, text: trimmed }));
      setChatMessages((prev) => [
        ...prev,
        { id, from: userId, name: displayName, text: trimmed, ts: Date.now(), isLocal: true },
      ]);
    },
    [userId, displayName]
  );

  // ── Host controls ────────────────────────────────────────────────────────
  const toggleHand = useCallback(() => {
    const next = !isHandRaised;
    setIsHandRaised(next);
    wsRef.current?.send(JSON.stringify({ type: "raise-hand", raised: next }));
  }, [isHandRaised]);

  const mutePeer = useCallback((peerId: string) => {
    wsRef.current?.send(JSON.stringify({ type: "host-mute", to: peerId }));
  }, []);

  const camOffPeer = useCallback((peerId: string) => {
    wsRef.current?.send(JSON.stringify({ type: "host-cam-off", to: peerId }));
  }, []);

  const kickPeer = useCallback((peerId: string) => {
    wsRef.current?.send(JSON.stringify({ type: "host-kick", to: peerId }));
  }, []);

  return {
    localStream, peers, chatMessages, reactions,
    sendChat, sendReaction,
    isScreenSharing, toggleScreenShare,
    isHandRaised, raisedHands, toggleHand,
    mutePeer, camOffPeer, kickPeer,
    error,
  };
}
