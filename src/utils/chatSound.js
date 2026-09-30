const STORAGE_KEY = "benevolentChatSoundEnabled";
let audioContext = null;
let unlockBound = false;

function getContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    if (!audioContext) audioContext = new AudioContextClass();
    return audioContext;
  } catch {
    return null;
  }
}

export function isChatSoundEnabled() {
  if (typeof window === "undefined") return true;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === null ? true : value === "true";
  } catch {
    return true;
  }
}

export function setChatSoundEnabled(enabled) {
  const value = Boolean(enabled);
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {}
  return value;
}

export function unlockChatSound() {
  const ctx = getContext();
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  if (unlockBound || typeof window === "undefined") return;
  unlockBound = true;
  const unlock = () => {
    const current = getContext();
    if (current?.state === "suspended") current.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

export function playIncomingMessageSound() {
  if (!isChatSoundEnabled()) return false;
  const ctx = getContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      return false;
    }
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.055, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
    master.connect(ctx.destination);

    [659.25, 880].forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + index * 0.055;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.7, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      oscillator.connect(gain).connect(master);
      oscillator.start(start);
      oscillator.stop(start + 0.15);
    });
    return true;
  } catch {
    return false;
  }
}
