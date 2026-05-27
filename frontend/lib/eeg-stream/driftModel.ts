import { makeRng } from "../eeg-simulation";

// ── DriftModel ────────────────────────────────────────────────────────────────
//
// Produces a slow, channel-specific mean offset that grows over simulated
// session time.  Drift is a sum of:
//   1. A very-low-frequency sinusoid (~0.005–0.02 Hz)  — electrode impedance cycle
//   2. A linear trend growing with session time         — cumulative impedance shift
//   3. A "step" component at random drift events        — sudden electrode movement
//
// driftIntensity (0–3) scales the overall amplitude.

export interface DriftEvent {
  channelIndex: number;
  time: number;      // seconds
  magnitude: number; // μV
}

export class DriftModel {
  private sampleCount = 0;
  private nChannels: number;
  private rng: () => number;

  // Per-channel characteristic parameters
  private slowFreq:   number[];
  private slowPhase:  number[];
  private medFreq:    number[];
  private medPhase:   number[];
  private linearRate: number[]; // μV per minute
  private stepAccum:  number[]; // accumulated step offsets

  // Logged drift events for display
  readonly events: DriftEvent[] = [];
  private nextStepCheck = 500; // samples

  constructor(nChannels: number, seed = 77) {
    this.nChannels = nChannels;
    this.rng = makeRng(seed);

    this.slowFreq   = Array.from({ length: nChannels }, () => 0.004 + this.rng() * 0.008);
    this.slowPhase  = Array.from({ length: nChannels }, (_, i) => i * 0.9 + this.rng() * 0.5);
    this.medFreq    = Array.from({ length: nChannels }, () => 0.015 + this.rng() * 0.015);
    this.medPhase   = Array.from({ length: nChannels }, () => this.rng() * Math.PI * 2);
    this.linearRate = Array.from({ length: nChannels }, () => (this.rng() - 0.4) * 3); // ±3 μV/min
    this.stepAccum  = new Array(nChannels).fill(0);
  }

  /** Advance internal clock by `n` samples, possibly logging a step event. */
  advance(n: number, driftIntensity: number) {
    this.sampleCount += n;

    // Occasionally inject a step drift event on one channel
    if (this.sampleCount >= this.nextStepCheck) {
      this.nextStepCheck = this.sampleCount + Math.round(1500 + this.rng() * 3000);
      if (this.rng() < 0.55 && driftIntensity > 0.2) {
        const ch  = Math.floor(this.rng() * this.nChannels);
        const mag = (this.rng() - 0.5) * driftIntensity * 18;
        this.stepAccum[ch] += mag;
        this.events.push({ channelIndex: ch, time: this.elapsedSeconds, magnitude: mag });
        if (this.events.length > 40) this.events.shift();
      }
    }
  }

  /** Returns per-channel drift offset in μV for the current session time. */
  getDrift(driftIntensity: number): number[] {
    const t = this.elapsedSeconds;
    return Array.from({ length: this.nChannels }, (_, ch) => {
      const slow   = Math.sin(2 * Math.PI * this.slowFreq[ch] * t + this.slowPhase[ch]);
      const med    = Math.sin(2 * Math.PI * this.medFreq[ch]  * t + this.medPhase[ch]);
      const linear = (this.linearRate[ch] / 60) * t;
      const step   = this.stepAccum[ch];
      return driftIntensity * (slow * 12 + med * 6 + linear * 8 + step);
    });
  }

  reset(seed = 77) {
    this.sampleCount = 0;
    this.events.length = 0;
    this.nextStepCheck = 500;
    this.rng = makeRng(seed);
    this.stepAccum.fill(0);
    // Re-randomize characteristic parameters
    this.slowFreq  = Array.from({ length: this.nChannels }, () => 0.004 + this.rng() * 0.008);
    this.slowPhase = Array.from({ length: this.nChannels }, (_, i) => i * 0.9 + this.rng() * 0.5);
    this.medFreq   = Array.from({ length: this.nChannels }, () => 0.015 + this.rng() * 0.015);
    this.medPhase  = Array.from({ length: this.nChannels }, () => this.rng() * Math.PI * 2);
    this.linearRate= Array.from({ length: this.nChannels }, () => (this.rng() - 0.4) * 3);
  }

  get elapsedSeconds(): number {
    return this.sampleCount / 250;
  }

  /** 0–1 scalar representing how much the total drift has accumulated */
  get driftIndex(): number {
    const meanAbs = this.stepAccum.reduce((a, v) => a + Math.abs(v), 0) / this.nChannels;
    return Math.min(1, meanAbs / 30);
  }
}
