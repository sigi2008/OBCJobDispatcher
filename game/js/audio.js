'use strict';
// ---------- Generative, entspannte Musik + Soundeffekte (Web Audio) ----------
const Sound = {
  ctx: null, master: null, music: null, sfx: null, rev: null, delay: null,
  musicOn: true, sfxOn: true, nextBeat: 0, beat: 0, melodyNote: 4, timer: null, nextBird: 0,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0.8; this.master.connect(c.destination);
    this.music = c.createGain(); this.music.gain.value = this.musicOn ? 0.32 : 0; this.music.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = this.sfxOn ? 0.5 : 0; this.sfx.connect(this.master);
    // Hall
    const len = c.sampleRate * 3, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.rev = c.createConvolver(); this.rev.buffer = buf;
    const revGain = c.createGain(); revGain.gain.value = 0.55; this.rev.connect(revGain); revGain.connect(this.music);
    // Echo
    this.delay = c.createDelay(2); this.delay.delayTime.value = 0.64;
    const fb = c.createGain(); fb.gain.value = 0.35; const dl = c.createGain(); dl.gain.value = 0.3;
    this.delay.connect(fb); fb.connect(this.delay); this.delay.connect(dl); dl.connect(this.music); dl.connect(this.rev);
    this.nextBeat = c.currentTime + 0.3;
    this.timer = setInterval(() => this.schedule(), 100);
  },

  setMusic(on) { this.musicOn = on; if (this.music) this.music.gain.setTargetAtTime(on ? 0.32 : 0, this.ctx.currentTime, 0.4); },
  setSfx(on) { this.sfxOn = on; if (this.sfx) this.sfx.gain.value = on ? 0.5 : 0; },

  mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); },

  // Akkorde: Fmaj7 – G6 – Em7 – Am7 – Dm9 – G – Cmaj7 – Cmaj7
  chords: [[53, 57, 60, 64], [55, 59, 62, 64], [52, 55, 59, 62], [57, 60, 64, 67], [50, 53, 57, 60, 64], [55, 59, 62, 67], [48, 52, 55, 59], [48, 52, 55, 62]],
  scale: [60, 62, 64, 67, 69, 72, 74, 76, 79, 81],
  BEAT: 60 / 68,

  schedule() {
    const c = this.ctx; if (!c || !this.musicOn) { if (c) this.nextBeat = Math.max(this.nextBeat, c.currentTime + 0.1); return; }
    while (this.nextBeat < c.currentTime + 0.6) {
      const t = this.nextBeat, b = this.beat, ci = Math.floor(b / 8) % this.chords.length, chord = this.chords[ci];
      const night = typeof G !== 'undefined' && G.night > 0.3;
      if (b % 8 === 0) {
        for (const n of chord) this.pad(this.mtof(n), t, this.BEAT * 8.5, 0.05);
        this.pluck(this.mtof(chord[0] - 12), t, 0.16, 2.5, 'sine');
      }
      if (b % 8 === 4) this.pluck(this.mtof(chord[0] - 12 + (Math.random() < 0.5 ? 7 : 0)), t, 0.1, 2, 'sine');
      // Melodie (Kalimba-artig)
      const p = night ? 0.3 : 0.5;
      if (Math.random() < p) {
        this.melodyNote = U.clamp(this.melodyNote + Math.floor(Math.random() * 5) - 2, 0, this.scale.length - 1);
        let n = this.scale[this.melodyNote];
        this.bell(this.mtof(n), t + (Math.random() < 0.25 ? this.BEAT / 2 : 0), 0.09);
      }
      // gelegentliches Arpeggio
      if (b % 16 === 12 && Math.random() < 0.6) chord.forEach((n, i) => this.bell(this.mtof(n + 12), t + i * this.BEAT / 3, 0.045));
      this.nextBeat += this.BEAT; this.beat++;
    }
    // Vogelgezwitscher am Tag
    if (c.currentTime > this.nextBird) {
      this.nextBird = c.currentTime + 5 + Math.random() * 12;
      if (typeof G !== 'undefined' && G.night < 0.2 && G.started) this.bird(c.currentTime + 0.1);
    }
  },

  pad(f, t, dur, vol) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 2); g.gain.setValueAtTime(vol, t + dur - 2); g.gain.linearRampToValueAtTime(0, t + dur + 1);
    for (const [type, det] of [['sine', 0], ['triangle', 6], ['triangle', -6]]) {
      const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 1.2);
    }
    lp.connect(g); g.connect(this.music); g.connect(this.rev);
  },

  pluck(f, t, vol, dec, type = 'triangle') {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
    o.connect(g); g.connect(this.music); o.start(t); o.stop(t + dec + 0.1);
  },

  bell(f, t, vol) {
    const c = this.ctx, g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
    for (const [m, a] of [[1, 1], [2.01, 0.25], [3.98, 0.08]]) {
      const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.value = f * m; og.gain.value = a;
      o.connect(og); og.connect(g); o.start(t); o.stop(t + 2);
    }
    g.connect(this.music); g.connect(this.delay); g.connect(this.rev);
  },

  bird(t) {
    const c = this.ctx, n = 2 + Math.floor(Math.random() * 4), base = 2400 + Math.random() * 1500;
    for (let i = 0; i < n; i++) {
      const o = c.createOscillator(), g = c.createGain(), s = t + i * 0.13;
      o.type = 'sine'; o.frequency.setValueAtTime(base, s); o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), s + 0.06); o.frequency.exponentialRampToValueAtTime(base * 0.9, s + 0.1);
      g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(0.018, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.11);
      o.connect(g); g.connect(this.music); g.connect(this.rev); o.start(s); o.stop(s + 0.13);
    }
  },

  // ---------- Effekte ----------
  play(name) {
    const c = this.ctx; if (!c || !this.sfxOn) return;
    const t = c.currentTime;
    const tone = (f, s, d, v, type = 'triangle', f2) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t + s);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + s + d);
      g.gain.setValueAtTime(v, t + s); g.gain.exponentialRampToValueAtTime(0.0001, t + s + d);
      o.connect(g); g.connect(this.sfx); o.start(t + s); o.stop(t + s + d + 0.05);
    };
    const noise = (s, d, v, freq) => {
      const len = Math.floor(c.sampleRate * d), b = c.createBuffer(1, len, c.sampleRate), dd = b.getChannelData(0);
      for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2; g.gain.value = v;
      src.connect(f); f.connect(g); g.connect(this.sfx); src.start(t + s);
    };
    switch (name) {
      case 'chop': noise(0, 0.12, 0.7, 900); tone(160, 0, 0.12, 0.3, 'sine', 90); break;
      case 'mine': noise(0, 0.08, 0.6, 2500); tone(900, 0, 0.08, 0.15, 'square', 600); break;
      case 'pick': tone(660, 0, 0.1, 0.18); tone(990, 0.07, 0.14, 0.18); break;
      case 'build': noise(0, 0.1, 0.5, 400); tone(220, 0, 0.15, 0.25, 'sine', 140); break;
      case 'craft': tone(523, 0, 0.12, 0.2); tone(659, 0.08, 0.12, 0.2); tone(784, 0.16, 0.25, 0.2); break;
      case 'success': [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.4, 0.18)); break;
      case 'friend': [784, 988, 1175].forEach((f, i) => tone(f, i * 0.09, 0.3, 0.15, 'sine')); break;
      case 'click': tone(800, 0, 0.05, 0.1, 'sine'); break;
      case 'nope': tone(220, 0, 0.15, 0.15, 'triangle', 180); break;
      case 'mount': tone(330, 0, 0.1, 0.18, 'sine', 500); break;
    }
  },
};
