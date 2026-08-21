const DEFAULT_RINGTONE_URL = "/sounds/benovelent-call.mp3";
let sharedContext = null;
let unlockBound = false;
let activeTone = null;

function ensureAudioContext() {
  if (typeof window === "undefined") return null;
  if (!sharedContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    sharedContext = new AudioContextClass();
  }
  if (sharedContext.state === "suspended") sharedContext.resume().catch(() => {});
  return sharedContext;
}

export function unlockCallAudio() {
  const ctx = ensureAudioContext();
  if (ctx) { try { const osc = ctx.createOscillator(); const gain = ctx.createGain(); gain.gain.value = 0.0001; osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.03); } catch {} }
  if (unlockBound) return;
  unlockBound = true;
  const unlock = () => { ensureAudioContext(); window.removeEventListener("pointerdown", unlock); window.removeEventListener("touchstart", unlock); window.removeEventListener("keydown", unlock); };
  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("touchstart", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });
}

export function startCallTone() {
  if (typeof window === "undefined") return { stop() {} };
  if (activeTone) return activeTone;
  unlockCallAudio();
  const configured = String(import.meta.env.VITE_CALL_RINGTONE_URL || "").trim();
  const src = configured || DEFAULT_RINGTONE_URL;
  const audio = new Audio(src);
  audio.loop = true; audio.preload = "auto"; audio.volume = 0.95; audio.setAttribute("playsinline", "true");
  let playRetry = null;
  const tryPlay = () => {
    audio.play().catch(() => {
      // Mobile browsers may defer autoplay even after a prior interaction.
      // Retry on the next user gesture/visibility change instead of failing silently forever.
    });
  };
  tryPlay();
  const retryPlay = () => tryPlay();
  window.addEventListener("pointerdown", retryPlay, { passive: true });
  window.addEventListener("touchstart", retryPlay, { passive: true });
  document.addEventListener("visibilitychange", retryPlay);
  playRetry = window.setInterval(() => {
    if (!audio.paused) return;
    tryPlay();
  }, 1500);
  const ctx = ensureAudioContext();
  let interval = null;
  if (ctx) {
    const ring = () => {
      try {
        const now = ctx.currentTime;
        [0, 0.22, 0.44].forEach((offset, index) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = "sine"; osc.frequency.value = index % 2 ? 1046.5 : 784;
          gain.gain.setValueAtTime(0.0001, now + offset); gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16);
          osc.connect(gain).connect(ctx.destination); osc.start(now + offset); osc.stop(now + offset + 0.18);
        });
      } catch {}
    };
    ring(); interval = window.setInterval(ring, 1800);
  }
  const handle = {
    stop() {
      if (activeTone !== handle) return;
      activeTone = null;
      if (interval) window.clearInterval(interval);
      if (playRetry) window.clearInterval(playRetry);
      window.removeEventListener("pointerdown", retryPlay);
      window.removeEventListener("touchstart", retryPlay);
      document.removeEventListener("visibilitychange", retryPlay);
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }
  };
  activeTone = handle;
  return handle;
}
