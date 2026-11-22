// Sound: every effect is synthesised with WebAudio, no audio files.
// A soft pad loop hums underneath; short blips mark pickups, alarms and
// the getaway. Created lazily on the first user gesture (browsers demand it).

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.musicTimer = null;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.stepCount = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startMusic();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // One short tone. `when` is a delay in seconds from now.
  tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = null) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A little filtered noise burst: footsteps, smoke, glass.
  noise(dur, vol = 0.12, freq = 800, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
  }

  step() {
    this.stepCount++;
    if (this.stepCount % 2 === 0) this.noise(0.05, 0.05, 500);
  }

  pickup() {
    this.tone(880, 0.12, 'sine', 0.18);
    this.tone(1318, 0.2, 'sine', 0.16, 0.07);
  }

  coinToss() {
    this.tone(1200, 0.09, 'triangle', 0.12, 0, 700);
  }

  coinLand() {
    this.tone(2400, 0.05, 'square', 0.06);
    this.tone(1900, 0.07, 'square', 0.05, 0.09);
  }

  smokePop() {
    this.noise(0.5, 0.2, 400);
  }

  glassCrack() {
    this.noise(0.18, 0.22, 3200);
    this.tone(1568, 0.3, 'sine', 0.1, 0.02);
  }

  spotted() {
    this.tone(220, 0.25, 'sawtooth', 0.14, 0, 440);
  }

  hackDone() {
    this.tone(523, 0.1, 'square', 0.1);
    this.tone(784, 0.1, 'square', 0.1, 0.09);
    this.tone(1046, 0.16, 'square', 0.1, 0.18);
  }

  caught() {
    this.tone(392, 0.3, 'sawtooth', 0.18, 0, 196);
    this.tone(311, 0.45, 'sawtooth', 0.18, 0.25, 155);
  }

  escaped() {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((n, i) => this.tone(n, 0.28, 'triangle', 0.16, i * 0.11));
  }

  lockdown() {
    this.tone(110, 0.5, 'square', 0.16, 0, 165);
    this.tone(110, 0.5, 'square', 0.16, 0.55, 165);
  }

  // The alarm siren while the meter is high: two alternating tones.
  setAlarmLevel(level) {
    if (!this.ctx) return;
    if (level > 0.55 && !this.alarmOsc) {
      this.alarmOsc = this.ctx.createOscillator();
      this.alarmOsc.type = 'sine';
      this.alarmGain = this.ctx.createGain();
      this.alarmGain.gain.value = 0;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 1.4;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 180;
      lfo.connect(lfoGain);
      lfoGain.connect(this.alarmOsc.frequency);
      this.alarmOsc.frequency.value = 700;
      this.alarmOsc.connect(this.alarmGain);
      this.alarmGain.connect(this.master);
      this.alarmOsc.start();
      lfo.start();
      this.alarmLfo = lfo;
    }
    if (this.alarmOsc) {
      const target = this.muted ? 0 : level > 0.55 ? 0.045 + level * 0.05 : 0;
      this.alarmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.3);
    }
  }

  // A slow, uneasy pad: low root notes drifting in a minor key.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const roots = [110, 110, 130.8, 98];
    let bar = 0;
    const playBar = () => {
      if (this.muted) return;
      const root = roots[bar % roots.length];
      bar++;
      this.tone(root, 3.6, 'sine', 0.05);
      this.tone(root * 1.5, 3.6, 'sine', 0.03, 0.1);
      this.tone(root * 1.189, 3.6, 'triangle', 0.02, 1.2);
    };
    playBar();
    this.musicTimer = window.setInterval(playBar, 3800);
  }
}
