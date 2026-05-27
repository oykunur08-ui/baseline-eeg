// ── Real-time EEG feature extractor ──────────────────────────────────────────
//
// Maintains exponential moving averages of mean and variance per channel.
// Used for:
//   - per-channel stability indicator
//   - drift-from-baseline magnitude
//   - alpha-band power proxy (RMS of the high-pass signal)
//
// All estimates are lightweight (no FFT) and suitable for 30 FPS updates.

export interface ChannelMetrics {
  /** Rolling RMS ≈ alpha-band power proxy (μV) */
  alphaPower: number;
  /** Rolling variance of raw signal */
  variance: number;
  /** Absolute mean shift from calibration baseline (normalized) */
  driftFromBaseline: number;
  /** 0 = highly unstable, 1 = very stable */
  stabilityScore: number;
}

const FAST_ALPHA = 0.025; // fast tracking for variance
const SLOW_ALPHA = 0.004; // slow tracking for baseline mean (drift detection)
const CALIB_SAMPLES = 750; // ~3 s before baseline is locked

export class FeatureExtractor {
  private nChannels: number;
  private fastMean:  Float64Array;
  private fastVar:   Float64Array;
  private slowMean:  Float64Array;
  private baselineMean: Float64Array | null = null;
  private baselineStd:  Float64Array | null = null;
  private totalSamples = 0;

  constructor(nChannels: number) {
    this.nChannels = nChannels;
    this.fastMean  = new Float64Array(nChannels);
    this.fastVar   = new Float64Array(nChannels).fill(200);
    this.slowMean  = new Float64Array(nChannels);
  }

  /** Feed a batch of new samples. Returns latest metrics per channel. */
  update(samples: Float32Array[]): ChannelMetrics[] {
    const n = samples[0]?.length ?? 0;

    for (let s = 0; s < n; s++) {
      for (let ch = 0; ch < this.nChannels; ch++) {
        const x = samples[ch][s];

        // Fast EMA for variance / RMS
        this.fastMean[ch] = (1 - FAST_ALPHA) * this.fastMean[ch] + FAST_ALPHA * x;
        const dev = x - this.fastMean[ch];
        this.fastVar[ch]  = (1 - FAST_ALPHA) * this.fastVar[ch]  + FAST_ALPHA * dev * dev;

        // Slow EMA for drift detection
        this.slowMean[ch] = (1 - SLOW_ALPHA) * this.slowMean[ch] + SLOW_ALPHA * x;
      }
      this.totalSamples++;
    }

    // Lock baseline after calibration window
    if (!this.baselineMean && this.totalSamples >= CALIB_SAMPLES) {
      this.baselineMean = this.slowMean.slice();
      this.baselineStd  = new Float64Array(this.nChannels).map(
        (_, ch) => Math.sqrt(this.fastVar[ch]) || 1,
      );
    }

    return Array.from({ length: this.nChannels }, (_, ch) => {
      const variance = this.fastVar[ch];
      const alphaPower = Math.sqrt(variance);

      let driftFromBaseline = 0;
      if (this.baselineMean) {
        const shift = Math.abs(this.slowMean[ch] - this.baselineMean[ch]);
        driftFromBaseline = shift / (this.baselineStd![ch] + 1);
      }

      const stabilityScore = Math.max(0, Math.min(1, 1 - driftFromBaseline * 0.4));

      return { alphaPower, variance, driftFromBaseline, stabilityScore };
    });
  }

  reset(nChannels: number) {
    this.nChannels = nChannels;
    this.fastMean  = new Float64Array(nChannels);
    this.fastVar   = new Float64Array(nChannels).fill(200);
    this.slowMean  = new Float64Array(nChannels);
    this.baselineMean = null;
    this.baselineStd  = null;
    this.totalSamples = 0;
  }

  get isCalibrated(): boolean {
    return this.baselineMean !== null;
  }
}
