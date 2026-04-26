/**
 * Portrait-mode background blur using MediaPipe Selfie Segmentation.
 * Blurs only the background behind the person — like iPhone portrait mode.
 *
 * Loaded from CDN at runtime; returns null while loading or when level = 0.
 */
import { useRef, useEffect, useState } from "react";

declare global {
  interface Window { SelfieSegmentation: new (cfg: { locateFile: (f: string) => string }) => any; }
}

export type BlurLevel = 0 | 1 | 2;

const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1";
const BLUR_PX: Record<1 | 2, number> = { 1: 14, 2: 28 };

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = Object.assign(document.createElement("script"), {
      src, crossOrigin: "anonymous",
      onload: resolve, onerror: reject,
    });
    document.head.appendChild(s);
  });
}

export function useBackgroundBlur(
  sourceStream: MediaStream | null,
  level: BlurLevel,
): MediaStream | null {
  const [blurredStream, setBlurredStream] = useState<MediaStream | null>(null);

  // Keep blur px accessible inside the per-frame callback without triggering re-init
  const levelRef = useRef<BlurLevel>(level);
  levelRef.current = level;

  const enabled = level > 0;

  useEffect(() => {
    if (!sourceStream || !enabled) {
      setBlurredStream(null);
      return;
    }

    let cancelled = false;

    // Offscreen elements — created once per stream session
    const canvas    = document.createElement("canvas");
    const ctx       = canvas.getContext("2d")!;
    const offCanvas = document.createElement("canvas");
    const offCtx    = offCanvas.getContext("2d")!;

    let seg: any        = null;
    let raf: number     = 0;
    let vid: HTMLVideoElement | null = null;

    async function run() {
      await loadScript(`${CDN}/selfie_segmentation.js`);
      if (cancelled) return;

      // Hidden video to decode the source stream
      vid = document.createElement("video");
      vid.srcObject = sourceStream;
      vid.muted     = true;
      vid.playsInline = true;
      await vid.play();
      if (cancelled) return;

      const W = vid.videoWidth  || 640;
      const H = vid.videoHeight || 480;
      canvas.width = offCanvas.width = W;
      canvas.height = offCanvas.height = H;

      seg = new window.SelfieSegmentation({ locateFile: (f: string) => `${CDN}/${f}` });
      seg.setOptions({ modelSelection: 1, selfieMode: true });

      seg.onResults((results: any) => {
        if (cancelled) return;
        const W2 = vid!.videoWidth  || 640;
        const H2 = vid!.videoHeight || 480;
        if (canvas.width !== W2 || canvas.height !== H2) {
          canvas.width = offCanvas.width = W2;
          canvas.height = offCanvas.height = H2;
        }
        const blurPx = BLUR_PX[levelRef.current as 1 | 2] ?? 14;

        // 1. Draw blurred background (scaled slightly to hide blur edge fringing)
        ctx.filter = `blur(${blurPx}px)`;
        ctx.drawImage(results.image, -blurPx, -blurPx, W2 + blurPx * 2, H2 + blurPx * 2);
        ctx.filter = "none";

        // 2. Build sharp person cutout on offscreen canvas using segmentation mask
        offCtx.clearRect(0, 0, W2, H2);
        offCtx.drawImage(results.image, 0, 0, W2, H2);
        offCtx.globalCompositeOperation = "destination-in";  // keep only where mask is white
        offCtx.drawImage(results.segmentationMask, 0, 0, W2, H2);
        offCtx.globalCompositeOperation = "source-over";

        // 3. Composite sharp person on top of blurred background
        ctx.drawImage(offCanvas, 0, 0);
      });

      await seg.initialize();
      if (cancelled) return;

      // Build output stream (video from canvas + audio from source)
      const out = canvas.captureStream(30);
      sourceStream?.getAudioTracks().forEach((t) => out.addTrack(t));
      setBlurredStream(out);

      const tick = async () => {
        if (cancelled || !vid) return;
        if (vid.readyState >= 2) {
          await seg.send({ image: vid }).catch(() => {});
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    run().catch(() => { /* graceful fallback — blurredStream stays null */ });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      seg?.close?.();
      if (vid) { vid.srcObject = null; }
      setBlurredStream(null);
    };
  }, [sourceStream, enabled]); // Re-init only when stream or on/off state changes

  return enabled ? blurredStream : null;
}
