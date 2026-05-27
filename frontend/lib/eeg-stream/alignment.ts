// ── Real-time EEG alignment ───────────────────────────────────────────────────
//
// Applies lightweight per-channel corrections to raw signal samples:
//
//   "zscore"    — subtract slow-EMA mean, divide by slow-EMA std
//                 Result: signal stays near zero with unit variance.
//                 Removes baseline drift; preserves oscillation shape.
//
//   "movingavg" — subtract fast-EMA mean only (no scaling)
//                 Result: DC-offset removed; amplitude preserved.
//
// These methods reinforce the platform's core insight:
//   alignment removes mean shift — it does not change the signal's
//   intrinsic frequency content or inter-class separability.

type AlignMethod = "none" | "zscore" | "movingavg";

const ALIGN_ALPHA_SLOW = 0.008; // very slow for drift correction
const ALIGN_ALPHA_FAST = 0.03;  // faster for moving average

export class RealtimeAligner {
  private nChannels: number;
  private slowMean: Float64Array;
  private slowVar:  Float64Array;
  private fastMean: Float64Array;

  constructor(nChannels: number) {
    this.nChannels = nChannels;
    this.slowMean  = new Float64Array(nChannels);
    this.slowVar   = new Float64Array(nChannels).fill(400); // σ ≈ 20 μV
    this.fastMean  = new Float64Array(nChannels);
  }

  /** Apply alignment to a batch of samples. Returns corrected samples in the
   *  same μV scale as the input (re-scaled after normalization). */
  apply(
    samples: Float32Array[],
    method: AlignMethod,
  ): Float32Array[] {
    if (method === "none") return samples;

    const nCh = samples.length;
    const nSamples = samples[0]?.length ?? 0;

    const result: Float32Array[] = Array.from({ length: nCh }, () => new Float32Array(nSamples));

    for (let s = 0; s < nSamples; s++) {
      for (let ch = 0; ch < nCh; ch++) {
        const x = samples[ch][s];

        if (method === "zscore") {
          this.slowMean[ch] = (1 - ALIGN_ALPHA_SLOW) * this.slowMean[ch] + ALIGN_ALPHA_SLOW * x;
          const dev = x - this.slowMean[ch];
          this.slowVar[ch]  = (1 - ALIGN_ALPHA_SLOW) * this.slowVar[ch]  + ALIGN_ALPHA_SLOW * dev * dev;
          const std = Math.sqrt(this.slowVar[ch]) || 1;
          // Re-scale to a fixed 20 μV RMS so display amplitude is consistent
          result[ch][s] = (dev / std) * 20;
        } else {
          // moving average: remove DC offset only
          this.fastMean[ch] = (1 - ALIGN_ALPHA_FAST) * this.fastMean[ch] + ALIGN_ALPHA_FAST * x;
          result[ch][s] = x - this.fastMean[ch];
        }
      }
    }

    return result;
  }

  reset(nChannels: number) {
    this.nChannels = nChannels;
    this.slowMean  = new Float64Array(nChannels);
    this.slowVar   = new Float64Array(nChannels).fill(400);
    this.fastMean  = new Float64Array(nChannels);
  }
}
