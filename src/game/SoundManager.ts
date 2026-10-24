import type { Language } from '../types/game';

class SoundManager {
  private ctx: AudioContext | null = null;
  private isSoundEnabled: boolean = true;
  private sfxVolume: number = 0.5;
  private ttsVolume: number = 0.9;
  private ttsRate: number = 0.95;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVoices();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }
    }
  }

  private initAudioContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private initVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  public setTtsVolume(vol: number) {
    this.ttsVolume = Math.max(0, Math.min(1, vol));
  }

  public setTtsRate(rate: number) {
    this.ttsRate = Math.max(0.5, Math.min(2, rate));
  }

  // --- Web Audio SFX Synthesizer ---

  public playLaserSound() {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      const now = this.ctx.currentTime;

      // Laser pitch sweep: 900Hz down to 200Hz in 0.1s
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

      gain.gain.setValueAtTime(this.sfxVolume * 0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      console.warn('Laser sound error', e);
    }
  }

  public playExplosionSound() {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.3; // 300ms of noise
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      // Filter noise to sound like a booming explosion
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, now);
      filter.frequency.linearRampToValueAtTime(80, now + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
    } catch (e) {
      console.warn('Explosion sound error', e);
    }
  }

  public playComboSound(combo: number) {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Pitch rises as combo increases
      const baseFreq = 440;
      const pitchMultiplier = 1 + Math.min(combo * 0.08, 1.2);
      osc.frequency.setValueAtTime(baseFreq * pitchMultiplier, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * pitchMultiplier * 1.5, now + 0.08);

      gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      console.warn('Combo sound error', e);
    }
  }

  public playDamageSound() {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(90, now + 0.25);

      gain.gain.setValueAtTime(this.sfxVolume * 0.5, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {
      console.warn('Damage sound error', e);
    }
  }

  public playVictoryFanfare() {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
      notes.forEach((freq, index) => {
        const now = (this.ctx?.currentTime || 0) + index * 0.1;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 0.26);
      });
    } catch (e) {
      console.warn('Fanfare error', e);
    }
  }

  // --- Dynamic Dopamine Audio Synthesizers ---

  /**
   * Sound of progress: Mỗi phím gõ đúng phát ra nốt nhạc tăng dần cao độ
   */
  public playTypingNote(step: number) {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pentatonic scale multipliers: C D E G A C
      const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];
      const baseFreq = scale[step % scale.length];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);

      gain.gain.setValueAtTime(this.sfxVolume * 0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {
      console.warn('Typing note error', e);
    }
  }

  /**
   * Chime chúc mừng mở khóa thành công 1 Hán tự trong từ ghép
   */
  public playSyllableTing() {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now); // C6
      osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.15); // E6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1567.98, now); // G6

      gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } catch (e) {
      console.warn('Syllable ting error', e);
    }
  }

  /**
   * Âm khựng đanh gọn khi bấm phím sai
   */
  public playErrorBuzz() {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(65, now + 0.12);

      gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      console.warn('Error buzz error', e);
    }
  }

  /**
   * Kích hoạt Fever Mode bùng nổ
   */
  public playFeverSound() {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const chords = [392.00, 493.88, 587.33, 783.99]; // G B D G
      chords.forEach((freq, idx) => {
        const now = (this.ctx?.currentTime || 0) + idx * 0.05;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(this.sfxVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now);
        osc.stop(now + 0.31);
      });
    } catch (e) {
      console.warn('Fever sound error', e);
    }
  }

  /**
   * Kích hoạt Kỹ năng Đóng băng thời gian
   */
  public playFreezeSound() {
    if (!this.isSoundEnabled || this.sfxVolume === 0) return;
    try {
      this.initAudioContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.45);

      gain.gain.setValueAtTime(this.sfxVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.46);
    } catch (e) {
      console.warn('Freeze sound error', e);
    }
  }

  // --- Web Speech Synthesis (TTS) ---

  public speak(text: string, language: Language, force = true) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!this.isSoundEnabled || this.ttsVolume === 0) return;

    if (force) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = this.ttsVolume;
    utterance.rate = this.ttsRate;

    const langCodes: Record<Language, string> = {
      en: 'en-US',
      ja: 'ja-JP',
      zh: 'zh-CN'
    };
    const targetLang = langCodes[language];
    utterance.lang = targetLang;

    // Pick best matching native voice if available
    if (this.voices.length === 0) {
      this.initVoices();
    }
    const matchingVoice = this.voices.find(v => v.lang.startsWith(targetLang) || v.lang.replace('_', '-').startsWith(targetLang));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  public stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const soundManager = new SoundManager();
