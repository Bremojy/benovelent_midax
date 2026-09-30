const DEFAULT_RINGTONE_URL = "/sounds/benovelent-call.mp3";
let unlockBound = false;
let activeTone = null;

export function unlockCallAudio() {
  if (typeof window === "undefined" || unlockBound) return;
  unlockBound = true;
  const retry = () => {
    activeTone?.tryPlay?.();
  };
  window.addEventListener("pointerdown", retry, { passive: true });
  window.addEventListener("touchstart", retry, { passive: true });
  window.addEventListener("keydown", retry);
  document.addEventListener("visibilitychange", retry);
}

export function startCallTone() {
  if (typeof window === "undefined") return { stop() {} };
  if (activeTone) return activeTone;
  unlockCallAudio();

  const configured = String(import.meta.env.VITE_CALL_RINGTONE_URL || "").trim();
  const src = configured || DEFAULT_RINGTONE_URL;
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.95;
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("aria-hidden", "true");

  const tryPlay = () => {
    try {
      const result = audio.play();
      if (result?.catch) result.catch(() => {});
    } catch {}
  };

  const handle = {
    tryPlay,
    stop() {
      if (activeTone !== handle) return;
      activeTone = null;
      audio.pause();
      try { audio.currentTime = 0; } catch {}
      audio.removeAttribute("src");
      try { audio.load(); } catch {}
    },
  };
  activeTone = handle;
  tryPlay();
  return handle;
}
