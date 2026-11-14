// Phase 4 P3 #12 — WebAudio synthesized sounds (no files): click, launch rumble (filtered noise),
// radio beep, success chime, explosion. Mute toggle saved in localStorage. All calls are safe
// no-ops when audio is unavailable or muted.

const KEY = 'missionControl.muted';
let ctx = null;
let muted = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();

export const isMuted = () => muted;
export function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* storage may be blocked */ }
}

function ac() {
  if (muted) return null;
  try {
    ctx = ctx ?? new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, { type = 'sine', gain = 0.12, at = 0, slide = 0 } = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator(); const g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { freq = 400, q = 0.7, gain = 0.3, at = 0, type = 'lowpass', fadeIn = 0.05 } = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + at;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + fadeIn); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur);
}

export const sound = {
  click: () => tone(880, 0.05, { type: 'square', gain: 0.04 }),
  beep: (ok = true) => tone(ok ? 1046 : 330, ok ? 0.12 : 0.25, { type: ok ? 'sine' : 'sawtooth', gain: 0.08 }),
  radio: () => { tone(1400, 0.06, { gain: 0.05 }); tone(1800, 0.06, { gain: 0.05, at: 0.08 }); },
  rumble: (dur = 3) => noise(dur, { freq: 140, gain: 0.5, fadeIn: 0.6 }),
  chime: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, { gain: 0.09, at: i * 0.12 })),
  explosion: () => { noise(1.6, { freq: 900, gain: 0.7, fadeIn: 0.005 }); tone(80, 0.8, { type: 'triangle', gain: 0.3, slide: -50 }); },
  fail: () => tone(300, 0.6, { type: 'sawtooth', gain: 0.07, slide: -180 }),
};
