const DEFAULT_RINGTONE_URL = "/sounds/benovelent-call.mp3";

/**
 * Start the Benovelent call ringtone.
 * The local bundled asset is the default; VITE_CALL_RINGTONE_URL may override it
 * with another browser-playable audio URL when needed.
 */
export function startCallTone() {
  if (typeof window === "undefined") return { stop() {} };

  const configured = String(import.meta.env.VITE_CALL_RINGTONE_URL || "").trim();
  const src = configured || DEFAULT_RINGTONE_URL;
  const audio = new Audio(src);

  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.8;

  const playPromise = audio.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {
      // Browser autoplay policies can block sound until the user has interacted.
      // Keep the audio ready; the caller UI will stop it on accept/reject/end.
    });
  }

  return {
    stop() {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    },
  };
}
