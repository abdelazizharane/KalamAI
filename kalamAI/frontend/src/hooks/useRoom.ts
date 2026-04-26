import { useCallback } from "react";
import { useRoomStore } from "../store/roomStore";
import type { LanguageCode } from "../types";

const API = "";

export function useRoom() {
  const { setRoom, setParticipant, setIsHost, listeningLanguage } = useRoomStore();

  const createRoom = useCallback(
    async (hostName: string) => {
      const res = await fetch(`${API}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host_name: hostName, language: listeningLanguage }),
      });
      if (!res.ok) throw new Error("Impossible de créer la réunion");
      const data = await res.json();
      setRoom(data.room);
      setParticipant({ id: "host", name: hostName, language: listeningLanguage });
      setIsHost(true);
      return data as { code: string; link: string };
    },
    [listeningLanguage, setRoom, setParticipant, setIsHost]
  );

  const joinRoom = useCallback(
    async (code: string, name: string, language: LanguageCode) => {
      const res = await fetch(`${API}/api/rooms/${code.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, language }),
      });
      if (!res.ok) throw new Error("Réunion introuvable");
      const data = await res.json();
      setRoom(data.room);
      setParticipant(data.participant);
      setIsHost(false);
      return data;
    },
    [setRoom, setParticipant, setIsHost]
  );

  return { createRoom, joinRoom };
}
