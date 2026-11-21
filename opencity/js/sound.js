// Procedural WebAudio sound: no audio files needed.
let ctx = null;
let master = null;
let noiseBuf = null;
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

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  // Colored, no-DC noise source: only used as an input to short/filtered effects.
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = last * 0.96 + white * 0.04;
    data[i] = last * 2.2;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

export function toggleMute() {
  muted = !muted;
  if (ctx && master) master.gain.setTargetAtTime(muted ? 0 : masterLevel, ctx.currentTime, 0.025);
  return muted;
}

export function isMuted() { return muted; }

function noiseShot({ dur, freq, q = 1, gain, type = 'lowpass' }) {
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(f).connect(g).connect(master);
  src.start(ctx.currentTime, Math.random());
  src.stop(ctx.currentTime + dur + 0.05);
}

export function sfxShot(kind) {
  if (!ctx) return;
  if (kind === 'mg') {
    noiseShot({ dur: 0.08, freq: 1800, gain: 0.28, type: 'bandpass', q: 0.7 });
    noiseShot({ dur: 0.05, freq: 350, gain: 0.2 });
  } else if (kind === 'rpg') {
    noiseShot({ dur: 0.5, freq: 500, gain: 0.4 });
    noiseShot({ dur: 0.25, freq: 1200, gain: 0.2, type: 'bandpass', q: 1.5 });
  } else {
    noiseShot({ dur: 0.12, freq: 2200, gain: 0.32, type: 'bandpass', q: 0.8 });
    noiseShot({ dur: 0.08, freq: 400, gain: 0.24 });
  }
}

export function sfxExplosion() {
  if (!ctx) return;
  noiseShot({ dur: 1.1, freq: 220, gain: 0.8 });
  noiseShot({ dur: 0.4, freq: 900, gain: 0.35 });
  // sub thump
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(80, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.7, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  o.connect(g).connect(master);
  o.start();
  o.stop(ctx.currentTime + 0.65);
}

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

export function sfxPickup() {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(660, ctx.currentTime);
  o.frequency.setValueAtTime(990, ctx.currentTime + 0.07);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  o.connect(g).connect(master);
  o.start();
  o.stop(ctx.currentTime + 0.2);
}

export function sfxCash() {
  if (!ctx) return;
  for (const [i, freq] of [[0, 880], [1, 1320]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.09;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.26);
  }
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

// quick "thwip" for the web shooter
export function sfxWeb() {
  if (!ctx) return;
  noiseShot({ dur: 0.14, freq: 2600, gain: 0.25, type: 'highpass' });
  noiseShot({ dur: 0.07, freq: 900, gain: 0.1, type: 'bandpass', q: 1.5 });
}

// short ascending arpeggio for mission complete
export function sfxMissionPass() {
  if (!ctx) return;
  const notes = [440, 554, 659, 880];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + i * 0.12;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 0.55);
  });
}

// two descending notes for mission failed
export function sfxMissionFail() {
  if (!ctx) return;
  const notes = [392, 262];
  notes.forEach((freq, i) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const g = ctx.createGain();
    const t0 = ctx.currentTime + i * 0.22;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.1, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + 0.5);
  });
}

// far = 0 (overhead) .. 1 (distant): distant strikes rumble lower and quieter
export function sfxThunder(far = Math.random()) {
  if (!ctx) return;
  noiseShot({ dur: 1.8 + far * 1.5, freq: 110 - far * 45, gain: 0.55 * (1 - far * 0.65) });
  if (far < 0.5) noiseShot({ dur: 0.5, freq: 500, gain: 0.18 });
}

// low city ambience: wind + distant traffic, louder by day
export const cityHum = makeLoop(() => {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 240;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(f).connect(g).connect(master);
  src.start();
  return { src, g, stoppables: [src] };
});

export function setHum(vol) {
  if (!cityHum.nodes || !ctx) return;
  cityHum.nodes.g.gain.setTargetAtTime(vol * 0.045, ctx.currentTime, 1.2);
}

// master volume 0..1 (settings menu)
export function setMasterVolume(v) {
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.5, ctx.currentTime, 0.1);
}

// tense chase layer that swells with the wanted level
export const chase = makeLoop(() => {
  const bass = ctx.createOscillator();
  bass.type = 'triangle';
  bass.frequency.value = 55;
  const pulse = ctx.createOscillator(); // pumping gate
  pulse.type = 'square';
  pulse.frequency.value = 2.2;
  const pulseG = ctx.createGain();
  pulseG.gain.value = 0.5;
  const bg = ctx.createGain();
  bg.gain.value = 0;
  pulse.connect(pulseG).connect(bg.gain);
  bass.connect(bg).connect(master);
  // driving hats for high heat
  const hat = ctx.createBufferSource();
  hat.buffer = noiseBuf;
  hat.loop = true;
  const hf = ctx.createBiquadFilter();
  hf.type = 'highpass';
  hf.frequency.value = 7000;
  const hg = ctx.createGain();
  hg.gain.value = 0;
  const tick = ctx.createOscillator();
  tick.type = 'square';
  tick.frequency.value = 4.4;
  const tickG = ctx.createGain();
  tickG.gain.value = 0.5;
  tick.connect(tickG).connect(hg.gain);
  hat.connect(hf).connect(hg).connect(master);
  bass.start(); pulse.start(); hat.start(); tick.start();
  return { bg, hg, stoppables: [bass, pulse, hat, tick] };
});

// heat 0..1: silence -> bass pulse -> full drums
export function setChase(heat) {
  if (!chase.nodes || !ctx) return;
  chase.nodes.bg.gain.setTargetAtTime(heat * 0.09, ctx.currentTime, 0.8);
  chase.nodes.hg.gain.setTargetAtTime(Math.max(0, heat - 0.5) * 0.1, ctx.currentTime, 0.8);
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
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.setTargetAtTime(0.07, ctx.currentTime, 0.12);
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
  const base = 48 + s * 112;
  engine.nodes.o1.frequency.setTargetAtTime(base, ctx.currentTime, 0.055);
  engine.nodes.o2.frequency.setTargetAtTime(base * 1.08, ctx.currentTime, 0.055);
  engine.nodes.filter.frequency.setTargetAtTime(180 + s * 770, ctx.currentTime, 0.08);
  engine.nodes.g.gain.setTargetAtTime(0.018 + s * 0.095, ctx.currentTime, 0.09);
}

export const tireScreech = makeLoop(() => {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1100;
  filter.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(filter).connect(g).connect(master);
  src.start();
  return { g, stoppables: [src] };
});

export function setTireScreech(active) {
  if (!tireScreech.nodes || !ctx) return;
  tireScreech.nodes.g.gain.setTargetAtTime(active ? 0.16 : 0, ctx.currentTime, 0.055);
}

export const siren = makeLoop(() => {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = 650;
  const g = ctx.createGain();
  g.gain.value = 0.0001;
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
  const level = wantedStars > 0 ? Math.min(0.11, (0.035 + wantedStars * 0.012) * proximity) : 0.0001;
  siren.nodes.g.gain.setTargetAtTime(level, t, wantedStars > 0 ? 0.12 : 0.45);
}
