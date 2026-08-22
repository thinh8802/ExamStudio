// ============================================
// SOUNDSCAPE SERVICE - Web Audio API Ambient Audio Generator
// 100% Offline, Synthesized Audio (Clock Ticking, Rain, Binaural Beats, Brown Noise)
// ============================================

export type SoundscapePreset = 'none' | 'clock' | 'rain' | 'binaural' | 'brown' | 'beta';

export interface SoundscapeState {
  currentPreset: SoundscapePreset;
  volume: number; // 0 to 1
  isPlaying: boolean;
}

const STORAGE_KEY_VOLUME = 'examprep_soundscape_volume';
const STORAGE_KEY_SFX_VOLUME = 'examprep_sfx_volume';

class SoundscapeService {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentPreset: SoundscapePreset = 'none';
  private volume: number = 0.5;
  private sfxVolume: number = 0.85;
  private isPlaying: boolean = false;
  private timerInterval: any = null;
  private noiseSource: AudioNode | null = null;
  private oscillators: OscillatorNode[] = [];
  private listeners: ((state: SoundscapeState) => void)[] = [];

  constructor() {
    // Load saved volumes
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem(STORAGE_KEY_VOLUME) || localStorage.getItem('examstudio_soundscape_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }
      const savedSfx = localStorage.getItem(STORAGE_KEY_SFX_VOLUME) || localStorage.getItem('examstudio_sfx_volume');
      if (savedSfx !== null) {
        const parsedSfx = parseFloat(savedSfx);
        if (!isNaN(parsedSfx) && parsedSfx >= 0 && parsedSfx <= 1) {
          this.sfxVolume = parsedSfx;
        }
      }
    }
  }

  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioCtx = new AudioContextClass();
      
      // Master Gain for Ambient soundscape
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);

      // Dedicated Gain for Sound Effects (SFX)
      this.sfxGain = this.audioCtx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.audioCtx.currentTime);
      this.sfxGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SFX_VOLUME, String(this.sfxVolume));
    }
    if (this.audioCtx && this.sfxGain) {
      try {
        const now = this.audioCtx.currentTime;
        this.sfxGain.gain.cancelScheduledValues(now);
        this.sfxGain.gain.linearRampToValueAtTime(this.sfxVolume, now + 0.05);
      } catch {
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.audioCtx.currentTime);
      }
    }
  }

  public subscribe(listener: (state: SoundscapeState) => void) {
    this.listeners.push(listener);
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }

  public getState(): SoundscapeState {
    return {
      currentPreset: this.currentPreset,
      volume: this.volume,
      isPlaying: this.isPlaying,
    };
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(this.volume));
    }
    if (this.audioCtx && this.masterGain) {
      try {
        const now = this.audioCtx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.05);
      } catch {
        this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      }
    }
    this.notify();
  }

  public stop() {
    this.cleanupActiveSound();
    this.isPlaying = false;
    this.currentPreset = 'none';
    
    // Suspend audio context when idle to save CPU / battery
    if (this.audioCtx && this.audioCtx.state === 'running') {
      setTimeout(() => {
        if (!this.isPlaying && this.audioCtx && this.audioCtx.state === 'running') {
          this.audioCtx.suspend().catch(() => {});
        }
      }, 500);
    }

    this.notify();
  }

  public play(preset: SoundscapePreset) {
    if (preset === 'none') {
      this.stop();
      return;
    }

    this.initAudio();
    this.cleanupActiveSound();

    this.currentPreset = preset;
    this.isPlaying = true;

    try {
      if (preset === 'clock') {
        this.startClockTicking();
      } else if (preset === 'rain') {
        this.startRainSound();
      } else if (preset === 'binaural') {
        this.startBinauralBeats(10); // Alpha 10Hz
      } else if (preset === 'brown') {
        this.startBrownNoise();
      } else if (preset === 'beta') {
        this.startBinauralBeats(20); // Beta 20Hz
      }
    } catch (e) {
      console.warn('[Soundscape] Failed to play preset:', e);
    }

    this.notify();
  }

  private cleanupActiveSound() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.noiseSource) {
      try {
        (this.noiseSource as any).stop?.();
        this.noiseSource.disconnect();
      } catch (e) {}
      this.noiseSource = null;
    }

    this.oscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    this.oscillators = [];
  }

  // --- Streak Success Chime (Plays on EVERY correct streak) ---
  public playStreakChime(streak: number = 1) {
    try {
      this.initAudio();
      if (!this.audioCtx || !this.sfxGain) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Base note rises dynamically with streak (Pentatonic intervals C, D, E, G, A, C5, D5, E5...)
      const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
      const noteIdx = (streak - 1) % scale.length;
      const octaveShift = Math.floor((streak - 1) / scale.length);
      const rootFreq = scale[noteIdx] * Math.pow(1.25, Math.min(octaveShift, 2));

      // Main Oscillator: Rich Sine tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(rootFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(rootFreq * 1.33, now + 0.12);

      // Sparkle Harmonic Oscillator: Triangle overtone for crystal brilliance
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(rootFreq * 2, now);
      osc2.frequency.exponentialRampToValueAtTime(rootFreq * 2.66, now + 0.14);

      // High volume for crisp and rewarding feedback (0.75 gain)
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(0.75, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.linearRampToValueAtTime(0.45, now + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc1.connect(gain1);
      gain1.connect(this.sfxGain);

      osc2.connect(gain2);
      gain2.connect(this.sfxGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.35);
    } catch {
      // Audio errors in headless / disabled environments ignored
    }
  }

  // --- Wrong Answer / Streak Broken Sound Effect ---
  public playWrongSound() {
    try {
      this.initAudio();
      if (!this.audioCtx || !this.sfxGain) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Dual descending low tones (gentle bonk/thud, clear but not harsh)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Low-pass filter to make it soft and pleasant, not sharp
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.28);

      // Pitch drops down: 280Hz -> 140Hz
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.28);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.65, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio errors in headless / disabled environments ignored
    }
  }

  // --- Luxurious Crystal Harmony Level-Up Chime (Chuông pha lê phong cách Apple / Diamond Reward) ---
  public playLevelUpChime(tier: number = 1) {
    try {
      this.initAudio();
      const sfxGain = this.sfxGain;
      if (!this.audioCtx || !sfxGain) return;

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Hợp âm Major 9th tinh tế, sang trọng & truyền cảm hứng theo từng cấp độ
      const chords = [
        [523.25, 659.25, 783.99, 1046.50],  // C Maj (C5, E5, G5, C6) - Tươi sáng
        [587.33, 739.99, 880.00, 1174.66],  // D Maj (D5, F#5, A5, D6)
        [659.25, 830.61, 987.77, 1318.51],  // E Maj (E5, G#5, B5, E6)
        [698.46, 880.00, 1046.50, 1396.91], // F Maj (F5, A5, C6, F6)
        [783.99, 987.77, 1174.66, 1567.98], // G Maj (G5, B5, D6, G6)
        [880.00, 1108.73, 1318.51, 1760.00],// A Maj (A5, C#6, E6, A6) - Kim cương
        [1046.50, 1318.51, 1567.98, 2093.00]// C High Crystal - Huyền thoại
      ];

      const chord = chords[Math.min(tier - 1, chords.length - 1)] || chords[0];

      // Rải chùm 4 nốt chuông pha lê (mỗi nốt cách nhau 40ms)
      chord.forEach((freq, i) => {
        const noteTime = now + i * 0.042;
        const osc = ctx.createOscillator();
        const overtone = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // Bộ lọc trầm ấm, triệt tiêu tiếng gắt, tạo độ vang sang trọng
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3800, noteTime);
        filter.frequency.exponentialRampToValueAtTime(1400, noteTime + 0.65);

        // Nốt gốc dạng sóng Sine thuần khiết
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteTime);

        // Nốt hòa âm tinh tế dạng sóng Sine vi sai (+2Hz) tạo độ rộng không gian 3D
        overtone.type = 'sine';
        overtone.frequency.setValueAtTime(freq * 2 + 2, noteTime);

        // Biên độ mượt mà, ngân vang êm ái (Decay tự nhiên 0.9s)
        const peakGain = 0.24 - i * 0.025;
        noteGain.gain.setValueAtTime(0.0001, noteTime);
        noteGain.gain.linearRampToValueAtTime(Math.max(0.12, peakGain), noteTime + 0.015);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.85);

        osc.connect(filter);
        overtone.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(sfxGain);

        osc.start(noteTime);
        overtone.start(noteTime);
        osc.stop(noteTime + 0.9);
        overtone.stop(noteTime + 0.9);
      });
    } catch {
      // Audio errors in headless / disabled environments ignored
    }
  }



  // --- 1. Synthesized Clock Ticking (Tick... Tock...) ---
  private startClockTicking() {
    if (!this.audioCtx || !this.masterGain) return;

    let isTick = true;
    const playTick = () => {
      if (!this.audioCtx || !this.masterGain) return;
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Tick is 820Hz, Tock is 620Hz
      osc.frequency.setValueAtTime(isTick ? 820 : 620, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.038);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);

      isTick = !isTick;
    };

    playTick();
    this.timerInterval = setInterval(playTick, 1000);
  }

  // --- 2. Synthesized Calm Rain Sound (Pink Noise Buffer + LFO Filter) ---
  private startRainSound() {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    // Create 4-second pink noise buffer and loop it
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Lowpass filter for rain droplets
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, ctx.currentTime);

    // LFO to modulate filter frequency gently (simulates wind & varying raindrops)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime); // 0.15Hz slow wave
    lfoGain.gain.setValueAtTime(250, ctx.currentTime); // modulate ±250Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    whiteNoise.connect(filter);
    filter.connect(this.masterGain);

    whiteNoise.start(0);
    this.noiseSource = whiteNoise;
    this.oscillators.push(lfo);
  }

  // --- 3. Synthesized Brown Noise (Deep study & ADHD focus / Waterfall) ---
  private startBrownNoise() {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Scale up for rich low rumble
    }

    const brownSource = ctx.createBufferSource();
    brownSource.buffer = noiseBuffer;
    brownSource.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    brownSource.connect(filter);
    filter.connect(this.masterGain);

    brownSource.start(0);
    this.noiseSource = brownSource;
  }

  // --- 4. Alpha / Beta Binaural Beats (Stereo differential) ---
  private startBinauralBeats(differenceHz: number = 10) {
    if (!this.audioCtx || !this.masterGain) return;
    const ctx = this.audioCtx;

    // Carrier frequency: 216 Hz for Alpha (10Hz diff), 220 Hz for Beta (20Hz diff)
    const carrier = 220;
    const merger = ctx.createChannelMerger(2);

    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.setValueAtTime(carrier, ctx.currentTime);

    const gainL = ctx.createGain();
    gainL.gain.setValueAtTime(0.12, ctx.currentTime);
    oscL.connect(gainL);
    gainL.connect(merger, 0, 0); // Left channel

    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.setValueAtTime(carrier + differenceHz, ctx.currentTime);

    const gainR = ctx.createGain();
    gainR.gain.setValueAtTime(0.12, ctx.currentTime);
    oscR.connect(gainR);
    gainR.connect(merger, 0, 1); // Right channel

    merger.connect(this.masterGain);

    oscL.start();
    oscR.start();

    this.oscillators = [oscL, oscR];
  }
}

export const soundscapeService = new SoundscapeService();

