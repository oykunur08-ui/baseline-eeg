"""
experiments/run_all.py
Run all four experiments and print a summary report.

Usage:
    python -m experiments.run_all
    python experiments/run_all.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from evaluation.stability      import run_stability_experiment
from evaluation.classification import run_classification_experiment
from evaluation.calibration    import run_calibration_experiment
from evaluation.failure        import run_failure_analysis


def _section(title: str) -> None:
    bar = "─" * 60
    print(f"\n{bar}")
    print(f"  {title}")
    print(bar)


def run_all(seed: int = 42, save_json: bool = True) -> dict:
    print("\n╔══════════════════════════════════════════╗")
    print("║  BASELINE — Experiment Suite             ║")
    print("║  EEG Representation Alignment Evaluation ║")
    print("╚══════════════════════════════════════════╝")

    _section("Experiment A: Session Variance Reduction")
    stab = run_stability_experiment(n_subjects=8, n_sessions=30, seed=seed)
    print(f"  Mean D(x) variance — raw: {stab['mean_deviation_variance']['raw']:.6f}")
    for k, v in stab["variance_reduction_pct"].items():
        print(f"  Reduction ({k:15s}): {v:+.1f}%")

    _section("Experiment B: Classification Improvement")
    clf = run_classification_experiment(n_subjects=8, n_sessions=40, seed=seed)
    print(f"  Baseline accuracy (raw): {clf['mean_accuracy']['raw']:.3f}")
    for k, v in clf["mean_improvement_pct"].items():
        print(f"  Improvement ({k:15s}): {v:+.1f}pp")

    _section("Experiment C: Calibration Efficiency")
    calib = run_calibration_experiment(n_subjects=6, n_sessions=50, seed=seed)
    print(f"  {calib['key_finding']}")
    for n, r in zip(calib["curves"]["calib_sessions"],
                    calib["curves"]["variance_reduction_pct"]):
        print(f"    n={n:3d} sessions → {r:+.1f}% variance reduction")

    _section("Experiment D: Failure Analysis")
    fail = run_failure_analysis(n_subjects=6, seed=seed)
    for s in fail["scenarios"]:
        flag = "⚠" if s["failure_rate"] > 0.2 else "✓"
        print(
            f"  {flag} {s['scenario']:35s} "
            f"reduction={s['mean_reduction_pct']:+5.1f}%  "
            f"fail_rate={s['failure_rate']:.0%}"
        )

    print("\n" + "─" * 60)
    print("  Key findings:")
    for f in fail["key_findings"]:
        print(f"  · {f}")
    print("─" * 60 + "\n")

    results = {
        "stability":      stab,
        "classification": clf,
        "calibration":    calib,
        "failure":        fail,
    }

    if save_json:
        out_path = Path(__file__).parent.parent / "data" / "experiment_results.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as f:
            json.dump(results, f, indent=2, default=str)
        print(f"Results saved to {out_path}")

    return results


if __name__ == "__main__":
    run_all()
