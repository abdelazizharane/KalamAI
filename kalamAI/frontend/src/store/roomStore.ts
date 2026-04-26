import { create } from "zustand";
import type { Room, Participant, LanguageCode } from "../types";

interface RoomStore {
  room: Room | null;
  participant: Participant | null;
  isHost: boolean;
  listeningLanguage: LanguageCode;
  isMicOn: boolean;
  isCamOn: boolean;
  isTranslating: boolean;
  originalVolume: number;
  translationVolume: number;

  setRoom: (room: Room) => void;
  setParticipant: (p: Participant) => void;
  setIsHost: (v: boolean) => void;
  setListeningLanguage: (lang: LanguageCode) => void;
  toggleMic: () => void;
  toggleCam: () => void;
  setMic: (v: boolean) => void;
  setCam: (v: boolean) => void;
  setTranslating: (v: boolean) => void;
  setOriginalVolume: (v: number) => void;
  setTranslationVolume: (v: number) => void;
  reset: () => void;
}

const saved = localStorage.getItem("kalamai_lang") as LanguageCode | null;

export const useRoomStore = create<RoomStore>((set) => ({
  room: null,
  participant: null,
  isHost: false,
  listeningLanguage: saved ?? "fr",
  isMicOn: true,
  isCamOn: true,
  isTranslating: false,
  originalVolume: 30,
  translationVolume: 100,

  setRoom: (room) => set({ room }),
  setParticipant: (participant) => set({ participant }),
  setIsHost: (isHost) => set({ isHost }),
  setListeningLanguage: (lang) => {
    localStorage.setItem("kalamai_lang", lang);
    set({ listeningLanguage: lang });
  },
  toggleMic: () => set((s) => ({ isMicOn: !s.isMicOn })),
  toggleCam: () => set((s) => ({ isCamOn: !s.isCamOn })),
  setMic: (isMicOn) => set({ isMicOn }),
  setCam: (isCamOn) => set({ isCamOn }),
  setTranslating: (isTranslating) => set({ isTranslating }),
  setOriginalVolume: (originalVolume) => set({ originalVolume }),
  setTranslationVolume: (translationVolume) => set({ translationVolume }),
  reset: () => set({ room: null, participant: null, isHost: false, isTranslating: false }),
}));
