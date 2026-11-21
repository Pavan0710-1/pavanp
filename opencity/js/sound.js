// Procedural WebAudio sound: no audio files needed.
let ctx = null;
let master = null;
let muted = false;
let masterLevel = 0.5;

export function initSound() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : masterLevel;
  master.connect(ctx.destination);
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

export function toggleMute() {
  muted = !muted;
  if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : masterLevel, ctx.currentTime, 0.025);
  return muted;
}

export function isMuted() { return muted; }

export function sfxShot() {}
export function sfxExplosion() {}
export function sfxPickup() {}
export function sfxCash() {}
export function sfxWeb() {}
export function sfxMissionPass() {}
export function sfxMissionFail() {}
export function sfxThunder() {}
export function setRain() {}
export function setRadioStation() {}

export const RADIO_STATIONS = Object.freeze([
  'LOFI 88.1',
  'DRIVE FM',
  'BASS 103',
  'DESI 96.3',
  'NITE JAZZ',
]);

export function sfxCrash(strength = 1) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(90, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.16);
  const g = ctx.createGain();
  g.gain.setValueAtTime(Math.min(0.55, 0.12 + strength * 0.025), ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
  o.connect(g).connect(master);
  o.start();
  o.stop(ctx.currentTime + 0.26);
}

// two-tone car horn (400 Hz + 500 Hz), softly low-pass filtered
export function sfxHorn() {
  if (!ctx) return;
  const bus = ctx.createGain();
  bus.gain.value = 0.08;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.7;
  bus.connect(filter).connect(master);
  for (const freq of [400, 500]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.connect(bus);
    bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    bus.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.025);
    bus.gain.setValueAtTime(0.08, ctx.currentTime + 0.32);
    bus.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.48);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  }
}

// master volume 0..1 (settings menu)
export function setMasterVolume(v) {
  masterLevel = Math.max(0, Math.min(1, v)) * 0.5;
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(muted ? 0 : masterLevel, ctx.currentTime, 0.1);
}

// ---------- looped sources (engine / rotor / siren) ----------

function makeLoop(build) {
  return {
    nodes: null,
    start() {
      if (!ctx || this.nodes) return;
      this.nodes = build();
    },
    stop() {
      if (!this.nodes) return;
      for (const n of this.nodes.stoppables) { try { n.stop(); } catch {} }
      this.nodes = null;
    },
  };
}

export const engine = makeLoop(() => {
  const o1 = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  o1.type = 'triangle';
  o2.type = 'sine';
  o1.frequency.value = 48;
  o2.frequency.value = 52;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 180;
  filter.Q.value = 0.5;
  const g = ctx.createGain();
  g.gain.value = 0;
  o1.connect(filter);
  o2.connect(filter);
  filter.connect(g).connect(master);
  o1.start();
  o2.start();
  return { o1, o2, filter, g, stoppables: [o1, o2] };
});

export function setEngine(speed) {
  if (!engine.nodes || !ctx) return;
  const s = Math.max(0, Math.min(1, speed / 38));
  const level = s < 0.03 ? 0 : s * 0.11;
  const base = 48 + s * 112;
  engine.nodes.o1.frequency.setTargetAtTime(base, ctx.currentTime, 0.055);
  engine.nodes.o2.frequency.setTargetAtTime(base * 1.08, ctx.currentTime, 0.055);
  engine.nodes.filter.frequency.setTargetAtTime(180 + s * 770, ctx.currentTime, 0.08);
  engine.nodes.g.gain.setTargetAtTime(level, ctx.currentTime, 0.09);
}

export const siren = makeLoop(() => {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = 650;
  const g = ctx.createGain();
  g.gain.value = 0;
  o.connect(g).connect(master);
  o.start();
  return { o, g, stoppables: [o] };
});

// wantedStars 0..5; smooth oscillation and clean fade when wanted is cleared
export function setSiren(wantedStars, proximity = 1) {
  if (!siren.nodes || !ctx) return;
  const t = ctx.currentTime;
  const phase = t % 1.2;
  const targetHz = phase < 0.6 ? 650 : 850;
  siren.nodes.o.frequency.setTargetAtTime(targetHz, t, 0.07);
  if (wantedStars > 0) {
    const level = Math.min(0.11, (0.035 + wantedStars * 0.012) * proximity);
    siren.nodes.g.gain.setTargetAtTime(level, t, 0.12);
  } else {
    siren.nodes.g.gain.cancelScheduledValues(t);
    siren.nodes.g.gain.setValueAtTime(0, t);
  }
}
