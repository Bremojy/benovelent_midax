let sharedAudioContext = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioContext) sharedAudioContext = new AudioContextClass();
  if (sharedAudioContext.state === "suspended") sharedAudioContext.resume().catch(() => {});
  return sharedAudioContext;
}

function createTone({ frequency, duration, gainValue = 0.03, type = "sine" }) {
  const ctx = getAudioContext();
  if (!ctx) return null;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = gainValue;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + duration / 1000);
  return { oscillator, gain };
}

export function startCallTone() {
  if (typeof window === "undefined") return { stop() {} };
  let stopped = false;
  const timers = [];
  let step = 0;
  const pattern = [[880, 140], [660, 140], [0, 220]];
  const schedule = () => {
    if (stopped) return;
    const [frequency, duration] = pattern[step % pattern.length];
    step += 1;
    if (frequency > 0) createTone({ frequency, duration, gainValue: 0.035, type: "sine" });
    timers.push(window.setTimeout(schedule, duration + 80));
  };
  schedule();
  return { stop() { stopped = true; timers.forEach((timer) => window.clearTimeout(timer)); } };
}
