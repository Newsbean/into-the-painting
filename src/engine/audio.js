// All sound is synthesised: one small theme, re-voiced for each painting
// (piano waltz, koto, harpsichord, cello, lute), plus chimes and wind.
// While a world is still grey the whole mix is muffled; it opens with colour.

const THEME = [
  [4, 1], [5, 1], [7, 2], [4, 1], [2, 1], [0, 2],
  [2, 1], [4, 1], [5, 1], [4, 1], [2, 2], [-1, 2],
  [4, 1], [7, 1], [8, 2], [7, 1], [5, 1], [4, 2],
  [2, 1], [0, 1], [2, 1], [4, 1], [0, 3], [-1, 1],
];

const WORLDS = {
  gallery: { scale: [0, 3, 5, 7, 10], root: 57, bpm: 50, voice: 'bell', pad: 0.5, sparse: 0.45, chords: [0, 2, 3, 0] },
  starry: { scale: [0, 2, 4, 5, 7, 9, 11], root: 62, bpm: 88, voice: 'piano', pad: 0.55, sparse: 1, chords: [0, 3, 4, 0], waltz: true },
  wave: { scale: [0, 1, 5, 7, 8], root: 62, bpm: 64, voice: 'koto', pad: 0.3, sparse: 0.85, chords: [0, 2, 3, 0], breath: true },
  pearl: { scale: [0, 2, 4, 5, 7, 9, 11], root: 67, bpm: 96, voice: 'harpsi', pad: 0.35, sparse: 1, chords: [0, 4, 3, 0], arp: true },
  scream: { scale: [0, 2, 3, 5, 7, 8, 10], root: 50, bpm: 52, voice: 'cello', pad: 0.6, sparse: 0.9, chords: [0, 5, 3, 4] },
  mona: { scale: [0, 2, 3, 5, 7, 9, 10], root: 57, bpm: 74, voice: 'lute', pad: 0.4, sparse: 1, chords: [0, 3, 6, 0], arp: true },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class GameAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.world = null;
    this.open = 1;
  }

  // given: an OfflineAudioContext, when a film score is rendered instead of played
  start(given) {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!given && !AC) return;
    const ctx = (this.ctx = given ?? new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass';
    this.lp.frequency.value = 16000;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master.connect(this.lp).connect(comp).connect(ctx.destination);

    // plate-ish reverb from decaying noise
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.rev = ctx.createConvolver();
    this.rev.buffer = ir;
    const rg = ctx.createGain();
    rg.gain.value = 0.42;
    this.rev.connect(rg).connect(this.master);

    this.music = ctx.createGain();
    this.music.gain.value = 0;
    this.music.connect(this.master);
    this.music.connect(this.rev);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
    this.sfx.connect(this.rev);

    // wind bed for flying
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noiseBuf = nb;
    const ns = ctx.createBufferSource();
    ns.buffer = nb;
    ns.loop = true;
    this.windF = ctx.createBiquadFilter();
    this.windF.type = 'bandpass';
    this.windF.frequency.value = 500;
    this.windF.Q.value = 0.7;
    this.windG = ctx.createGain();
    this.windG.gain.value = 0;
    ns.connect(this.windF).connect(this.windG).connect(this.master);
    ns.start();

    this.step = 0;
    this.nextT = ctx.currentTime + 0.3;
    if (!given) this.timer = setInterval(() => this.schedule(), 90);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.ctx.currentTime, 0.1);
    return this.muted;
  }

  setWorld(key) {
    if (!this.ctx || this.world === key) return (this.world = key);
    this.world = key;
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(0, t, 0.35);
    this.music.gain.setTargetAtTime(0.5, t + 1.4, 0.9);
    this.step = 0;
    this.nextT = t + 1.6;
  }

  // 0 = grey and muffled, 1 = fully painted
  setOpen(v) {
    this.open = v;
    if (!this.ctx) return;
    this.lp.frequency.setTargetAtTime(520 + Math.pow(v, 1.6) * 15000, this.ctx.currentTime, 0.6);
  }
  setWind(v) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windG.gain.setTargetAtTime(v * 0.16, t, 0.25);
    this.windF.frequency.setTargetAtTime(380 + v * 900, t, 0.3);
  }

  note(deg, W, oct = 0) {
    const n = W.scale.length;
    const o = Math.floor(deg / n);
    return W.root + W.scale[((deg % n) + n) % n] + 12 * (o + oct);
  }

  voice(type, midi, t, dur, vel = 1, dest = this.music) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const g = ctx.createGain();
    g.connect(dest);
    const osc = (wave, freq, gain, det = 0) => {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = freq;
      o.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = gain;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + dur + 3.5);
      return o;
    };
    const env = (a, d, peak, sus = 0.0001) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak * vel, t + a);
      g.gain.exponentialRampToValueAtTime(Math.max(sus * vel, 0.0001), t + a + d);
    };
    if (type === 'piano') {
      osc('sine', f, 0.6);
      osc('triangle', f * 2, 0.16);
      osc('sine', f * 3.01, 0.05);
      env(0.008, 2.2, 0.2);
    } else if (type === 'bell') {
      osc('sine', f, 0.5);
      osc('sine', f * 2.76, 0.18);
      osc('sine', f * 5.4, 0.07);
      env(0.004, 3.4, 0.16);
    } else if (type === 'koto') {
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.Q.value = 3;
      flt.frequency.setValueAtTime(f * 9, t);
      flt.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.5);
      g.disconnect();
      g.connect(flt).connect(dest);
      const o = osc('sawtooth', f, 0.5);
      o.frequency.setValueAtTime(f * 1.018, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
      osc('triangle', f * 2, 0.14);
      env(0.004, 1.5, 0.2);
    } else if (type === 'breath') {
      const o = osc('sine', f, 0.6);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5;
      const lg = ctx.createGain();
      lg.gain.value = f * 0.012;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t + 0.4);
      lfo.stop(t + dur + 2);
      osc('triangle', f * 2, 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.085 * vel, t + 0.35);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.5);
    } else if (type === 'harpsi') {
      osc('sawtooth', f, 0.28);
      osc('square', f * 2, 0.07);
      osc('sawtooth', f * 2.005, 0.1);
      env(0.003, 0.95, 0.11);
    } else if (type === 'lute') {
      osc('triangle', f, 0.55);
      osc('sawtooth', f, 0.08, 5);
      osc('sine', f * 2, 0.12);
      env(0.005, 1.3, 0.2);
    } else if (type === 'cello') {
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = Math.min(f * 3.2, 1900);
      g.disconnect();
      g.connect(flt).connect(dest);
      const o = osc('sawtooth', f, 0.4);
      osc('sawtooth', f, 0.25, 7);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4.6;
      const lg = ctx.createGain();
      lg.gain.value = f * 0.008;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t + 0.5);
      lfo.stop(t + dur + 2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.13 * vel, t + 0.4);
      g.gain.setTargetAtTime(0.0001, t + dur, 0.6);
    } else if (type === 'pad') {
      const flt = ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 900;
      g.disconnect();
      g.connect(flt).connect(dest);
      osc('sawtooth', f, 0.2, -6);
      osc('sawtooth', f, 0.2, 6);
      osc('sine', f * 0.5, 0.35);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045 * vel, t + dur * 0.4);
      g.gain.setTargetAtTime(0.0001, t + dur * 0.8, dur * 0.35);
    }
  }

  // until: schedule everything up to that time at once (offline rendering)
  schedule(until) {
    const ctx = this.ctx;
    const W = WORLDS[this.world];
    if (!W || (until === undefined && ctx.state !== 'running')) return;
    const beat = 60 / W.bpm;
    const horizon = until ?? ctx.currentTime + 0.35;
    while (this.nextT < horizon) {
      const i = this.step % THEME.length;
      const bar = Math.floor(this.step / 6);
      const [deg, len] = THEME[i];
      const t = this.nextT;
      if (deg >= 0 && Math.random() < W.sparse) {
        this.voice(W.voice, this.note(deg, W, 1), t, beat * len, 0.9);
        if (W.breath && len >= 2) this.voice('breath', this.note(deg, W, 1), t, beat * len * 1.2, 0.8);
        if (W.arp) this.voice(W.voice, this.note(deg + 2, W, 0), t + beat * 0.5, beat * 0.5, 0.45);
      }
      // slow harmony under the tune
      if (i % 6 === 0) {
        const rootDeg = W.chords[bar % W.chords.length];
        const dur = beat * 8;
        for (const d of [0, 2, 4]) this.voice('pad', this.note(rootDeg + d, W, -1), t, dur, W.pad);
        this.voice(W.voice === 'cello' ? 'cello' : 'pad', this.note(rootDeg, W, -2), t, dur, W.pad * 0.9);
        if (W.waltz) {
          for (let k = 1; k < 6; k++) if (k % 3 !== 0) this.voice('piano', this.note(rootDeg + (k % 2 ? 2 : 4), W, 0), t + beat * k * 1.34, beat, 0.28);
        }
      }
      this.nextT += beat * len;
      this.step++;
    }
  }

  // ---------- one-shots
  // one clear note of the world's own scale: a minigame's cue, or its answer
  tone(k = 0, len = 0.9, vel = 1) {
    if (!this.ctx) return;
    const W = WORLDS[this.world] ?? WORLDS.gallery;
    this.voice('bell', this.note(k, W, 2), this.ctx.currentTime + 0.01, len, vel, this.sfx);
  }
  chime(k = 0, at) {
    if (!this.ctx) return;
    const W = WORLDS[this.world] ?? WORLDS.gallery;
    const t = (at ?? this.ctx.currentTime) + 0.02;
    [0, 2, 4, 7].forEach((d, i) => this.voice('bell', this.note(d + k, W, 2), t + i * 0.11, 2, 1.1, this.sfx));
    this.whoosh(1.6, 300, 2400, 0.22, at);
  }
  whoosh(dur = 1.5, f0 = 200, f1 = 1800, gain = 0.2, at) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = at ?? ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t);
    s.stop(t + dur + 0.1);
  }
  thunder() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(70, t + 3.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    s.connect(f).connect(g).connect(this.sfx);
    s.start(t);
    s.stop(t + 4.2);
  }
  finale(at) {
    if (!this.ctx) return;
    const W = WORLDS[this.world] ?? WORLDS.gallery;
    const t = (at ?? this.ctx.currentTime) + 0.05;
    [0, 2, 4, 7, 9, 11, 14].forEach((d, i) => this.voice('bell', this.note(d, W, 1), t + i * 0.16, 3, 1.2, this.sfx));
    for (const d of [0, 2, 4]) this.voice('pad', this.note(d, W, 0), t, 7, 1.4);
    this.whoosh(3.2, 150, 3200, 0.3, at);
  }
}

// The score for a film, rendered offline with the game's own theme and voices.
// cues:  [{ t, world, open? }]  the theme restarts in that world's voicing at t
// marks: [{ t, kind: 'chime' | 'finale' | 'whoosh' | 'open' | 'muffle', world?, k? }]
export async function renderScore(cues, duration, marks = [], rate = 44100) {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * rate), rate);
  const a = new GameAudio();
  a.start(ctx);
  a.music.gain.value = 0.5;
  const shared = a.music;
  const X = 0.45; // crossfade between voicings
  cues.forEach((c, i) => {
    const end = i + 1 < cues.length ? cues[i + 1].t : duration;
    // each voicing gets its own bus, so its long pads leave with it
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, 0);
    bus.gain.setValueAtTime(0, Math.max(0, c.t - 0.05));
    bus.gain.linearRampToValueAtTime(1, c.t + (i ? X : 0.05));
    bus.gain.setValueAtTime(1, Math.max(c.t + X, end - 0.1));
    bus.gain.linearRampToValueAtTime(0, end + X);
    bus.connect(shared);
    a.music = bus;
    a.world = c.world;
    a.step = 0;
    a.nextT = c.t + 0.04;
    a.schedule(end);
  });
  a.music = shared;
  for (const m of marks) {
    if (m.world) a.world = m.world;
    if (m.kind === 'chime') a.chime(m.k ?? 0, m.t);
    else if (m.kind === 'finale') a.finale(m.t);
    else if (m.kind === 'whoosh') a.whoosh(m.dur ?? 2.4, m.f0 ?? 120, m.f1 ?? 2400, m.gain ?? 0.3, m.t);
    else if (m.kind === 'muffle') a.lp.frequency.setValueAtTime(m.hz ?? 620, m.t);
    else if (m.kind === 'open') a.lp.frequency.setTargetAtTime(16000, m.t, m.tau ?? 0.5);
  }
  // a short fade at the very end
  a.master.gain.setValueAtTime(0.9, Math.max(0, duration - 1.6));
  a.master.gain.linearRampToValueAtTime(0, duration - 0.02);
  return ctx.startRendering();
}

// 16-bit stereo WAV from an AudioBuffer
export function wavBlob(buf) {
  const n = buf.length,
    ch = buf.numberOfChannels,
    rate = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  out.setUint32(4, 36 + n * ch * 2, true);
  str(8, 'WAVEfmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, ch, true);
  out.setUint32(24, rate, true);
  out.setUint32(28, rate * ch * 2, true);
  out.setUint16(32, ch * 2, true);
  out.setUint16(34, 16, true);
  str(36, 'data');
  out.setUint32(40, n * ch * 2, true);
  const data = [];
  for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, data[c][i]));
      out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      o += 2;
    }
  return new Blob([out], { type: 'audio/wav' });
}
