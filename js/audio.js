// SYNTHESIZED WEB AUDIO API SOUND EFFECTS

class BubblyAudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Helper: Create a standard gain node with exponential decay
  createDecayEnvelope(duration, startGain = 0.3) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(startGain, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    return gain;
  }

  // --- AUDIO PATTERNS ---

  // High pitch short bubble pop
  playPop() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.createDecayEnvelope(0.08, 0.25);

    osc.type = 'sine';
    // Frequency sweep: start mid, jump high
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Bubble addition (glug glug slosh)
  playGlug() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    
    // Play two quick overlapping bubbly glugs
    for (let i = 0; i < 2; i++) {
      const delay = i * 0.12;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150 + (i * 80), now + delay);
      osc.frequency.exponentialRampToValueAtTime(320 + (i * 120), now + delay + 0.1);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.13);
    }
  }

  // Fizzy carbonation sound (fast tiny clicks/noise)
  playFizz() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    
    // Play 5 tiny high-pitch pops in rapid succession to sound like fizzy bubbles
    for (let i = 0; i < 6; i++) {
      const delay = i * 0.04 + Math.random() * 0.02;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800 + Math.random() * 600, now + delay);
      
      gainNode.gain.setValueAtTime(0.05, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.02);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.025);
    }
  }

  // Major arpeggio for goal success & levels
  playSuccess() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C major notes
    const now = this.ctx.currentTime;

    notes.forEach((freq, index) => {
      const delay = index * 0.08;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + delay + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.35);
    });
  }

  // Sad descending drone for failures / pops
  playFail() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(60, this.ctx.currentTime + 0.6);

    gainNode.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

    // Apply a lowpass filter to make it sound muffled/underwater
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }

  // Alarm sound pulsing for panic mode
  playSiren() {
    this.resume();
    if (!this.ctx || this.muted) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    
    // Frequency sweeps back and forth like a siren
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.linearRampToValueAtTime(550, now + 0.2);
    osc.frequency.linearRampToValueAtTime(350, now + 0.4);

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.4);
  }
}

const FizzyAudio = new BubblyAudioEngine();
window.FizzyAudio = FizzyAudio;
