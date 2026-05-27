// ── Seeded deterministic RNG (Mulberry32) ────────────────────────────────────
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller Gaussian sample
export function sampleGaussian(rng: () => number, mean = 0, std = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── Core data types ───────────────────────────────────────────────────────────

export type Point2D = [number, number];

export interface EEGSession {
  index: number;
  class0: Point2D[]; // e.g. left motor imagery
  class1: Point2D[]; // e.g. right motor imagery
  centroid: Point2D; // mean of all points
}

// ── Drift Geometry Lab simulation ─────────────────────────────────────────────

export interface DriftSimConfig {
  nSessions?: number;
  driftIntensity?: number;
  noiseLevel?: number;
  pointsPerClass?: number;
  seed?: number;
}

export function simulateSessions({
  nSessions = 6,
  driftIntensity = 1.5,
  noiseLevel = 0.6,
  pointsPerClass = 30,
  seed = 42,
}: DriftSimConfig = {}): EEGSession[] {
  const rng = makeRng(seed);
  const classGap = 1.2;
  const sessions: EEGSession[] = [];

  for (let i = 0; i < nSessions; i++) {
    const t = nSessions > 1 ? i / (nSessions - 1) : 0;

    // Non-linear drift trajectory — realistic longitudinal shift
    const driftX = driftIntensity * (t * 1.8 + 0.3 * Math.sin(t * Math.PI * 2.1));
    const driftY = driftIntensity * (t * 0.9 - 0.35 * Math.cos(t * Math.PI * 1.6));

    // Within-session noise grows slightly with time (electrode impedance drift)
    const sesNoise = noiseLevel * (1 + 0.25 * t);

    const class0: Point2D[] = [];
    const class1: Point2D[] = [];

    for (let j = 0; j < pointsPerClass; j++) {
      class0.push([
        sampleGaussian(rng, -classGap + driftX, sesNoise),
        sampleGaussian(rng, 0.2 + driftY, sesNoise * 0.85),
      ]);
      class1.push([
        sampleGaussian(rng, +classGap + driftX, sesNoise),
        sampleGaussian(rng, -0.2 + driftY, sesNoise * 0.85),
      ]);
    }

    const all = [...class0, ...class1];
    const cx = all.reduce((a, p) => a + p[0], 0) / all.length;
    const cy = all.reduce((a, p) => a + p[1], 0) / all.length;

    sessions.push({ index: i, class0, class1, centroid: [cx, cy] });
  }

  return sessions;
}

// ── Alignment methods ─────────────────────────────────────────────────────────

function recomputeCentroid(s: EEGSession): EEGSession {
  const all = [...s.class0, ...s.class1];
  const cx = all.reduce((a, p) => a + p[0], 0) / all.length;
  const cy = all.reduce((a, p) => a + p[1], 0) / all.length;
  return { ...s, centroid: [cx, cy] };
}

// Z-score: subtract session mean, divide by per-axis std
export function alignZScore(sessions: EEGSession[]): EEGSession[] {
  return sessions.map((s) => {
    const all = [...s.class0, ...s.class1];
    const n = all.length;
    const mx = all.reduce((a, p) => a + p[0], 0) / n;
    const my = all.reduce((a, p) => a + p[1], 0) / n;
    const sx = Math.sqrt(all.reduce((a, p) => a + (p[0] - mx) ** 2, 0) / n) || 1;
    const sy = Math.sqrt(all.reduce((a, p) => a + (p[1] - my) ** 2, 0) / n) || 1;
    const norm = (pts: Point2D[]): Point2D[] =>
      pts.map(([x, y]) => [(x - mx) / sx, (y - my) / sy]);
    return recomputeCentroid({ ...s, class0: norm(s.class0), class1: norm(s.class1) });
  });
}

// Covariance whitening: fit on session 0, apply subtract-own-mean + calibration Σ^{-1/2}
export function alignCovarianceWhitening(sessions: EEGSession[]): EEGSession[] {
  // Fit whitening transform on calibration session (session 0)
  const cal = [...sessions[0].class0, ...sessions[0].class1];
  const n = cal.length;
  const mx = cal.reduce((a, p) => a + p[0], 0) / n;
  const my = cal.reduce((a, p) => a + p[1], 0) / n;

  let sxx = 0, sxy = 0, syy = 0;
  for (const [x, y] of cal) {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (y - my);
    syy += (y - my) ** 2;
  }
  sxx /= n; sxy /= n; syy /= n;

  // 2×2 eigendecomposition of [[sxx, sxy], [sxy, syy]]
  const tr = sxx + syy;
  const disc = Math.sqrt(Math.max(0, (tr / 2) ** 2 - (sxx * syy - sxy * sxy)));
  const λ1 = tr / 2 + disc;
  const λ2 = tr / 2 - disc;

  let e1x: number, e1y: number, e2x: number, e2y: number;
  if (Math.abs(sxy) > 1e-10) {
    const n1 = Math.sqrt((λ1 - syy) ** 2 + sxy ** 2);
    e1x = (λ1 - syy) / n1; e1y = sxy / n1;
    const n2 = Math.sqrt((λ2 - syy) ** 2 + sxy ** 2);
    e2x = (λ2 - syy) / n2; e2y = sxy / n2;
  } else {
    e1x = 1; e1y = 0; e2x = 0; e2y = 1;
  }

  // Whitening matrix W = V D^{-1/2} V^T
  const r1 = 1 / Math.sqrt(Math.max(λ1, 1e-10));
  const r2 = 1 / Math.sqrt(Math.max(λ2, 1e-10));
  const W00 = e1x * r1 * e1x + e2x * r2 * e2x;
  const W01 = e1x * r1 * e1y + e2x * r2 * e2y;
  const W10 = e1y * r1 * e1x + e2y * r2 * e2x;
  const W11 = e1y * r1 * e1y + e2y * r2 * e2y;

  return sessions.map((s) => {
    // Subtract session's own mean (centering), then apply calibration whitening
    const all = [...s.class0, ...s.class1];
    const smx = all.reduce((a, p) => a + p[0], 0) / all.length;
    const smy = all.reduce((a, p) => a + p[1], 0) / all.length;
    const whiten = (pts: Point2D[]): Point2D[] =>
      pts.map(([x, y]) => {
        const dx = x - smx;
        const dy = y - smy;
        return [W00 * dx + W01 * dy, W10 * dx + W11 * dy];
      });
    return recomputeCentroid({ ...s, class0: whiten(s.class0), class1: whiten(s.class1) });
  });
}

// Moving average adaptation: subtract exponentially weighted running mean
export function alignMovingAverage(sessions: EEGSession[], alpha = 0.35): EEGSession[] {
  const result: EEGSession[] = [];
  const init = [...sessions[0].class0, ...sessions[0].class1];
  let runX = init.reduce((a, p) => a + p[0], 0) / init.length;
  let runY = init.reduce((a, p) => a + p[1], 0) / init.length;

  for (const s of sessions) {
    const all = [...s.class0, ...s.class1];
    const smx = all.reduce((a, p) => a + p[0], 0) / all.length;
    const smy = all.reduce((a, p) => a + p[1], 0) / all.length;
    runX = (1 - alpha) * runX + alpha * smx;
    runY = (1 - alpha) * runY + alpha * smy;
    const shift = (pts: Point2D[]): Point2D[] =>
      pts.map(([x, y]) => [x - runX, y - runY]);
    result.push(recomputeCentroid({ ...s, class0: shift(s.class0), class1: shift(s.class1) }));
  }
  return result;
}

// ── Metrics ───────────────────────────────────────────────────────────────────

// L2 centroid drift relative to session 0
export function centroidDriftL2(sessions: EEGSession[]): number[] {
  const [bx, by] = sessions[0].centroid;
  return sessions.map((s) => {
    const dx = s.centroid[0] - bx;
    const dy = s.centroid[1] - by;
    return Math.sqrt(dx * dx + dy * dy);
  });
}

// 1D Fisher ratio on x-axis (between-class / within-class variance)
export function fisherRatio1D(sessions: EEGSession[]): number[] {
  return sessions.map((s) => {
    const n0 = s.class0.length;
    const n1 = s.class1.length;
    const m0 = s.class0.reduce((a, p) => a + p[0], 0) / n0;
    const m1 = s.class1.reduce((a, p) => a + p[0], 0) / n1;
    const v0 = s.class0.reduce((a, p) => a + (p[0] - m0) ** 2, 0) / n0;
    const v1 = s.class1.reduce((a, p) => a + (p[0] - m1) ** 2, 0) / n1;
    const within = v0 + v1;
    return within > 0 ? (m0 - m1) ** 2 / within : 0;
  });
}

// ── Calibration Efficiency simulation ────────────────────────────────────────

export interface CalibrationCurve {
  method: string;
  color: string;
  nSamples: number[];
  meanAcc: number[];
  upper: number[];
  lower: number[];
}

export function simulateCalibrationCurves(seed = 99): CalibrationCurve[] {
  const rng = makeRng(seed);
  const nValues = Array.from({ length: 22 }, (_, i) => Math.round(5 + i * 8.5));
  const TARGET = 0.576; // real BNCI result

  const specs = [
    { method: "Raw",             color: "#9B9790", peak: TARGET,        k: 0.011, baseVar: 0.082 },
    { method: "Z-score",         color: "#1B3F7A", peak: TARGET + 0.004, k: 0.024, baseVar: 0.048 },
    { method: "Cov. Whitening",  color: "#1E6B5C", peak: TARGET,        k: 0.027, baseVar: 0.042 },
    { method: "Moving Avg",      color: "#B8832A", peak: TARGET - 0.062, k: 0.016, baseVar: 0.091 },
  ];

  return specs.map(({ method, color, peak, k, baseVar }) => {
    const meanAcc: number[] = [];
    const upper: number[] = [];
    const lower: number[] = [];

    for (const n of nValues) {
      const mean = 0.5 + (peak - 0.5) * (1 - Math.exp(-k * n));
      const variance = baseVar * Math.exp(-0.022 * n) + 0.009;
      const noise = sampleGaussian(rng, 0, variance * 0.18);
      const m = Math.min(Math.max(mean + noise, 0.42), 0.74);
      meanAcc.push(+m.toFixed(4));
      upper.push(+Math.min(m + 1.96 * variance, 0.88).toFixed(4));
      lower.push(+Math.max(m - 1.96 * variance, 0.38).toFixed(4));
    }

    return { method, color, nSamples: nValues, meanAcc, upper, lower };
  });
}

// ── Longitudinal Feature Viewer simulation ────────────────────────────────────

export interface FeatureTrajectory {
  band: string;
  color: string;
  sessions: number[];
  raw: number[];
  aligned: number[];
  driftEvents: number[];
}

export function simulateLongitudinalFeatures(
  nSessions = 20,
  seed = 7
): FeatureTrajectory[] {
  const rng = makeRng(seed);
  const sessionIdx = Array.from({ length: nSessions }, (_, i) => i + 1);
  const driftEvents = [5, 12, 18].filter((e) => e <= nSessions);

  const bands = [
    { band: "Alpha (8–13 Hz)",  color: "#1E6B5C", base: 10.5, noise: 0.65, drift: (i: number) => 0.29 * i + 0.5 * Math.sin(i * 0.52) },
    { band: "Beta (13–30 Hz)",  color: "#1B3F7A", base: 7.8,  noise: 0.48, drift: (i: number) => 0.20 * i - 0.35 * Math.cos(i * 0.31) },
    { band: "Theta (4–8 Hz)",   color: "#B8832A", base: 6.2,  noise: 0.38, drift: (i: number) => -0.11 * i + 0.45 * Math.sin(i * 0.74 + 1) },
  ];

  return bands.map(({ band, color, base, noise, drift }) => {
    const raw: number[] = [];
    const aligned: number[] = [];
    let runMean = base;

    for (let i = 0; i < nSessions; i++) {
      const eventBump = driftEvents.includes(i + 1) ? sampleGaussian(rng, 1.3, 0.5) : 0;
      const v = base + drift(i) + sampleGaussian(rng, 0, noise) + eventBump;
      raw.push(+v.toFixed(3));
      runMean = 0.84 * runMean + 0.16 * v;
      const a = v - runMean + base + sampleGaussian(rng, 0, noise * 0.28);
      aligned.push(+a.toFixed(3));
    }

    return { band, color, sessions: sessionIdx, raw, aligned, driftEvents };
  });
}
