import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useRoomStore } from "../store/roomStore";
import LanguageSelector from "./LanguageSelector";

interface Props {
  roomCode: string;
}

export default function Controls({ roomCode }: Props) {
  const navigate = useNavigate();
  const { isMicOn, isCamOn, isTranslating, toggleMic, toggleCam, reset } =
    useRoomStore();

  const leave = () => {
    reset();
    navigate("/");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-between px-6 py-4 bg-surface/80 backdrop-blur border-t border-white/5">
      {/* Left: room code + copy */}
      <div className="flex items-center gap-3 w-48">
        <div className="hidden sm:flex flex-col">
          <span className="text-xs text-muted">Code</span>
          <span className="font-mono font-bold tracking-widest text-gray-100">
            {roomCode}
          </span>
        </div>
        <button
          onClick={copyLink}
          className="btn-ghost text-xs px-3 py-2 hidden sm:flex items-center gap-1.5"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Copy
        </button>
      </div>

      {/* Center: mic, cam, translation indicator */}
      <div className="flex items-center gap-2">
        {/* Mic */}
        <button
          onClick={toggleMic}
          className={clsx("control-btn", !isMicOn && "off")}
        >
          {isMicOn ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
              />
            </svg>
          )}
          <span className="text-[10px]">{isMicOn ? "Micro" : "Coupé"}</span>
        </button>

        {/* Camera */}
        <button
          onClick={toggleCam}
          className={clsx("control-btn", !isCamOn && "off")}
        >
          {isCamOn ? (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zM3 3l18 18"
              />
            </svg>
          )}
          <span className="text-[10px]">{isCamOn ? "Caméra" : "Éteinte"}</span>
        </button>

        {/* Translation status */}
        <div className={clsx("control-btn", isTranslating && "active")}>
          <div className="relative">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            {isTranslating && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-[10px]">
            {isTranslating ? "Actif" : "Traduction"}
          </span>
        </div>

        {/* Language selector */}
        <LanguageSelector compact />
      </div>

      {/* Right: leave button */}
      <div className="w-48 flex justify-end">
        <button
          onClick={leave}
          className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-all duration-150 active:scale-95"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Quitter
        </button>
      </div>
    </div>
  );
}
