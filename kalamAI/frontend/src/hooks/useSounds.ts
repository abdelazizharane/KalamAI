import { useRef, useCallback } from "react";

export function useSounds() {
  const ctxRef = useRef<AudioContext | null>(null);

  // Helper: ensure context exists and is running, THEN call the scheduler
  const withCtx = useCallback((schedule: (ac: AudioContext) => void) => {
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      const ac = ctxRef.current;
      if (ac.state === "running") {
        schedule(ac);
      } else {
        // Must await resume — currentTime stays at 0 until context is running
        ac.resume().then(() => schedule(ac)).catch(() => {});
      }
    } catch { /* AudioContext blocked (e.g. sandboxed iframe) */ }
  }, []);

  // African tam-tam drum — for raise hand
  const playTamTam = useCallback(() => {
    withCtx((ac) => {
      const now = ac.currentTime;

      // Main drum body: pitch sweep 170 Hz → 55 Hz
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(170, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.95, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.8);

      // Harmonic overtone for warmth
      const osc2 = ac.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(340, now);
      osc2.frequency.exponentialRampToValueAtTime(110, now + 0.15);
      const gain2 = ac.createGain();
      gain2.gain.setValueAtTime(0.28, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ac.destination);
      osc2.start(now);
      osc2.stop(now + 0.35);

      // Noise burst for the skin "slap" transient
      const bufLen = Math.floor(ac.sampleRate * 0.045);
      const buf = ac.createBuffer(1, bufLen, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
      const noise = ac.createBufferSource();
      noise.buffer = buf;
      const lp = ac.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0.55, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      noise.connect(lp);
      lp.connect(ng);
      ng.connect(ac.destination);
      noise.start(now);
    });
  }, [withCtx]);

  // Bright chime pattern — for emoji reactions
  const playChime = useCallback(() => {
    withCtx((ac) => {
      const now = ac.currentTime;
      // Ascending triad E5 → C6 → E6
      [659, 1047, 1319].forEach((freq, i) => {
        const osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const gain = ac.createGain();
        const t = now + i * 0.07;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.28, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.9);
      });
    });
  }, [withCtx]);

  // Ascending two-note — participant joined
  const playJoin = useCallback(() => {
    withCtx((ac) => {
      const now = ac.currentTime;
      [523, 659].forEach((freq, i) => {
        const osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const gain = ac.createGain();
        const t = now + i * 0.11;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    });
  }, [withCtx]);

  // Descending two-note — participant left
  const playLeave = useCallback(() => {
    withCtx((ac) => {
      const now = ac.currentTime;
      [659, 494].forEach((freq, i) => {
        const osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const gain = ac.createGain();
        const t = now + i * 0.11;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.18, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    });
  }, [withCtx]);

  // Soft single ping — for new chat message notification
  const playMessage = useCallback(() => {
    withCtx((ac) => {
      const now = ac.currentTime;
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }, [withCtx]);

  // Triumphant rising chord — played when you successfully join a room
  const playSuccess = useCallback(() => {
    withCtx((ac) => {
      const now = ac.currentTime;
      // Rising major chord: C5 → E5 → G5 → C6
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ac.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const gain = ac.createGain();
        const t = now + i * 0.09;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.65);
      });
    });
  }, [withCtx]);

  // Short "beep-boop" — played when recording starts
  const playRecordStart = useCallback(() => {
    withCtx((ac) => {
      const now = ac.currentTime;
      // Two quick beeps: high then low
      [[880, 0], [660, 0.15]].forEach(([freq, delay]) => {
        const osc = ac.createOscillator();
        osc.type = "square";
        osc.frequency.value = freq;
        const gain = ac.createGain();
        const t = now + delay;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + 0.15);
      });
    });
  }, [withCtx]);

  return { playTamTam, playChime, playJoin, playLeave, playMessage, playSuccess, playRecordStart };
}
