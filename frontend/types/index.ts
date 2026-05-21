export interface TransformResult {
  user_id: string;
  adapter: string;
  raw_features: number[];
  aligned_features: number[];
  mahal_distance: number;
  deviation_label: "stable" | "mild" | "moderate" | "high";
  z_scores: Record<string, number>;
  feature_contributions: Array<{ feature: string; abs_z: number }>;
}

export interface StabilityResult {
  experiment: string;
  n_subjects: number;
  n_sessions: number;
  mean_deviation_variance: Record<string, number>;
  variance_reduction_pct: Record<string, number>;
  per_subject: Array<{
    subject_id: string;
    dvar_raw: number;
    dvar_zscore: number;
    dvar_coral: number;
    dvar_ma: number;
    reduction_zscore: number;
    reduction_coral: number;
    reduction_ma: number;
  }>;
  adapter_series: {
    subjects: string[];
    raw: number[];
    zscore: number[];
    coral: number[];
    moving_average: number[];
  };
}

export interface ClassificationResult {
  experiment: string;
  mean_accuracy: Record<string, number>;
  mean_f1: Record<string, number>;
  mean_improvement_pct: Record<string, number>;
  chart_data: {
    methods: string[];
    accuracy: number[];
    f1: number[];
  };
}

export interface CalibrationResult {
  experiment: string;
  curves: {
    calib_sessions: number[];
    variance_raw: number[];
    variance_aligned: number[];
    variance_reduction_pct: number[];
  };
  key_finding: string;
}

export interface FailureResult {
  experiment: string;
  scenarios: Array<{
    scenario: string;
    mean_reduction_pct: number;
    failure_rate: number;
    noise_level: number;
    abrupt_drift: boolean;
  }>;
  key_findings: string[];
  chart_data: {
    scenario_names: string[];
    mean_reductions: number[];
    failure_rates: number[];
  };
}

export interface Subject {
  user_id: string;
  n_sessions: number;
  has_baseline: boolean;
  stability: number | null;
}
