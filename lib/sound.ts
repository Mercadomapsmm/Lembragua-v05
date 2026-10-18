// Web Audio API synthesizer for calming offline sound effects
class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Water droplet sound
  playWaterDrop() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Audio might be blocked by browser autoplay policy
    }
  }

  // Medicine clear friendly reminder bell
  playMedicineAlert() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const frequencies = [880, 1174.66]; // A5, D6
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.16;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.48);
      });
    } catch {
      // Audio blocked
    }
  }

  // Success fanfare when goal is completed
  playGoalCelebration() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.65);
      });
    } catch {
      // Audio blocked
    }
  }
}

export const sounds = new SoundManager();

export function triggerVibration(pattern: number[] = [100, 60, 100]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore
    }
  }
}
