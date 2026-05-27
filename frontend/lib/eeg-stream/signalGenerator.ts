import { makeRng, sampleGaussian } from "../eeg-simulation";

// ── Constants ─────────────────────────────────────────────────────────────────

export const SAMPLE_RATE     = 250;           // Hz (simulated)
export const DISPLAY_SECONDS = 4;             // seconds visible in window
export const DISPLAY_SAMPLES = SAMPLE_RATE * DISPLAY_SECONDS; // 1000
export const SAMPLES_PER_FRAME = 8;           // 250 / 30fps ≈ 8

export const ALL_CHANNEL_NAMES = ["Fp1", "Fp2", "Fz", "C3", "C4", "Cz", "P3", "P4"] as const;

// Scientific palette — not neon, not gamified
export const CHANNEL_COLORS = [
  "#7EC8E3", // Fp1  steel blue
  "#A8D4A8", // Fp2  sage green
  "#D4C87A", // Fz   warm amber
  "#C88AAA", // C3   dusty mauve
  "#7AAEC8", // C4   slate blue
  "#A8C8B4", // Cz   sea green
  "#C8A87A", // P3   sand
  "#7AC8BA", // P4   teal
];

// ── Per-channel signal configuration ─────────────────────────────────────────

interface ChannelConfig {
  alphaFreq:   number; // Hz  8–12
  alphaAmp:    number; // μV
  alphaPhase:  number; // radians
  betaFreq:    number; // Hz 14–30
  betaAmp:     number; // μV
  thetaFreq:   number; // Hz  4–7
  thetaAmp:    number; // μV
  noiseWeight: number; // scalar multiplier
}

function buildChannelConfigs(rng: () => number, n: number): ChannelConfig[] {
  return Array.from({ length: n }, () => ({
    alphaFreq:   9.0  + rng() * 2.5,
    alphaAmp:    18   + rng() * 14,
    alphaPhase:  rng() * Math.PI * 2,
    betaFreq:    16   + rng() * 12,
    betaAmp:     4    + rng() * 5,
    thetaFreq:   4.5  + rng() * 2.0,
    thetaAmp:    5    + rng() * 5,
    noiseWeight: 0.7  + rng() * 0.6,
  }));
}

// ── SignalGenerator class ─────────────────────────────────────────────────────

export class SignalGenerator {
  private t = 0;
  private rng: () => number;
  private channels: ChannelConfig[];

  constructor(seed: number, nChannels: number) {
    this.rng = makeRng(seed);
    this.channels = buildChannelConfigs(this.rng, nChannels);
  }

  /** Generate `n` new samples for each channel. `driftPerChannel` is pre-computed
   *  mean offset from the drift model (already in μV). */
  generate(
    n: number,
    noiseLevel: number,
    driftPerChannel: number[],
  ): Float32Array[] {
    const result: Float32Array[] = Array.from(
      { length: this.channels.length },
      () => new Float32Array(n),
    );

    for (let s = 0; s < n; s++) {
      const tSec = (this.t + s) / SAMPLE_RATE;

      for (let ch = 0; ch < this.channels.length; ch++) {
        const c = this.channels[ch];

        const alpha = c.alphaAmp * Math.sin(2 * Math.PI * c.alphaFreq * tSec + c.alphaPhase);
        const beta  = c.betaAmp  * Math.sin(2 * Math.PI * c.betaFreq  * tSec + c.alphaPhase * 0.8);
        const theta = c.thetaAmp * Math.sin(2 * Math.PI * c.thetaFreq * tSec + ch * 0.6);

        const noise    = sampleGaussian(this.rng, 0, noiseLevel * 7 * c.noiseWeight);
        const lfNoise  = sampleGaussian(this.rng, 0, noiseLevel * 2) * 0.08;
        const artifact = this.rng() > 0.9985 ? (this.rng() - 0.5) * 140 : 0;
        const drift    = driftPerChannel[ch] ?? 0;

        result[ch][s] = alpha + beta * 0.35 + theta * 0.25 + noise + lfNoise + artifact + drift;
      }
    }

    this.t += n;
    return result;
  }

  reset(seed: number, nChannels: number) {
    this.t = 0;
    this.rng = makeRng(seed);
    this.channels = buildChannelConfigs(this.rng, nChannels);
  }

  get elapsedSeconds(): number {
    return this.t / SAMPLE_RATE;
  }
}
