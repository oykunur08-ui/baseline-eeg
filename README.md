# BASELINE

> *Neural signals only become meaningful when interpreted relative to themselves.*

**Baseline** is a lightweight personalization and representation-alignment layer for wearable EEG systems operating under longitudinal drift, low-channel constraints, noisy preprocessing, and limited calibration conditions.

---

## What this is

Baseline investigates whether lightweight subject-specific representation alignment can improve stability, calibration efficiency, and downstream model performance in wearable EEG systems under real-world deployment constraints.

This is **not**: a classifier, a diagnostic tool, a mental health application, or a production system.

This **is**: a research-grade infrastructure concept, a modular domain adaptation layer for EEG pipelines, and a deployment-oriented alternative to population-level modeling.

---

## The problem

| Problem | Consequence |
|---|---|
| **Inter-subject variability** | Population models are biased against everyone they claim to represent |
| **Longitudinal drift** | Static calibrations become unreliable within sessions |
| **Wearable constraints** | 2–4 channels; no gel; noisy preprocessing |
| **Limited calibration** | Users will not endure 30-minute calibration protocols |

---

## Architecture

```
Raw EEG features
      │
      ▼
┌─────────────────────────────┐
│       BASELINE LAYER        │
│  1. Baseline learning       │   μ, Σ = fit(X_calib)
│  2. Embedding alignment     │   z = Σ⁻¹/² (x − μ)
│  3. Longitudinal adaptation │   μₜ = (1−α)μₜ₋₁ + αxₜ
└─────────────────────────────┘
      │
      ▼
Aligned embedding z → Downstream classifier f(z)
```

Baseline is a **drop-in layer** — no changes to downstream model architecture required.

---

## Project structure

```
baseline/
├── api/                    # FastAPI backend
│   ├── main.py
│   └── routes/             # baseline, experiments, data
├── sdk/
│   └── client.py           # Baseline SDK class
├── adaptation/
│   ├── z_score.py          # Per-feature z-score normalization
│   ├── coral.py            # CORAL covariance alignment
│   └── moving_average.py   # Exponential MA recalibration
├── evaluation/
│   ├── stability.py        # Exp A: variance reduction
│   ├── classification.py   # Exp B: classifier improvement
│   ├── calibration.py      # Exp C: calibration efficiency
│   └── failure.py          # Exp D: failure analysis
├── experiments/
│   └── run_all.py          # CLI experiment runner
├── core/                   # Statistical baseline engine
├── frontend/               # Next.js 15 cinematic UI
│   ├── app/page.tsx        # Main scrolling experience
│   └── app/demo/page.tsx   # Live experiment runner
├── config.py
├── requirements.txt
└── docker-compose.yml
```

---

## Alignment strategies

| Method | Description | Best for |
|---|---|---|
| **Z-score** | Per-feature normalization using personal μ, σ | Fast, interpretable, online |
| **CORAL** | Covariance alignment to baseline Σ | Session-level covariance shift |
| **Moving Average** | EMA recalibration tracking slow drift | Gradual longitudinal drift |

---

## Experiment results (synthetic data)

### A — Session Variance Reduction
```
Mahalanobis D(x) variance reduction (stable sessions):
  zscore         +34.1%
  coral          +96.4%
  moving_average +22.5%
```

### B — Classification Improvement (cross-subject pooled)
```
Baseline accuracy (raw): 60.3%
  zscore         +23.4pp
  moving_average +12.8pp
  coral          +0.0pp   (covariance alignment ≈ identity on same-distribution data)
```

### C — Calibration Efficiency
```
Aligned deviation variance stabilizes at ~10 calibration sessions.
Raw Mahalanobis scoring is >9500× more variable than aligned at 5 sessions.
```

### D — Failure Analysis
```
Normal conditions:       +43.0% reduction, 0% failure
High noise (σ×3):        +43.0% reduction, 0% failure
Very high noise (σ×6):   +44.7% reduction, 0% failure
Abrupt drift:            +28.5% reduction, 33% failure
Few calibration (3):      +0.0% reduction, 100% failure (below MIN_SESSIONS)
Few calibration (5):     +99.9% reduction, 0% failure
```

---

## SDK usage

```python
from sdk import Baseline

bl = Baseline(adapter="zscore")    # or "coral", "moving_average"

# Fit on calibration sessions
bl.fit("alice", calibration_df)

# Transform new session
result = bl.transform("alice", new_session_vector)
print(result.mahal_distance)       # 1.24
print(result.deviation_label)      # "mild"

# Evaluate alignment quality
report = bl.evaluate("alice")
print(report.variance_reduction)   # 42.1%

# Per-session reliability
reliabilities = bl.get_session_reliability("alice")
```

---

## Running locally

```bash
# Backend
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# Run all experiments
python -m experiments.run_all

# Frontend
cd frontend && npm install && npm run dev

# Docker (full stack)
cp .env.example .env && docker-compose up --build
```

---

## API reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/baseline/fit` | POST | Fit baseline for a user |
| `/api/baseline/transform` | POST | Transform + score a session |
| `/api/baseline/profile/{user_id}` | GET | Profile + drift history |
| `/api/data/generate-synthetic` | POST | Generate synthetic subjects |
| `/api/experiments/stability` | GET | Run Experiment A |
| `/api/experiments/classification` | GET | Run Experiment B |
| `/api/experiments/calibration` | GET | Run Experiment C |
| `/api/experiments/failure` | GET | Run Experiment D |
| `/api/experiments/all` | GET | Run all |

---

## Limitations

1. **Synthetic validation only** — no real device testing; results are proof-of-concept
2. **Linear alignment** — CORAL and z-score do not capture non-linear drift
3. **Static CORAL** — online mode reduces to z-score when no batch data is available
4. **Noise sensitivity** — performance degrades significantly above σ > 0.30
5. **Min calibration** — needs ≥ 5 sessions; performance improves until ~10

---

## Future directions

- Riemannian manifold alignment for SPD matrices
- Online Bayesian uncertainty quantification
- Multi-device cross-session validation with real hardware
- Federated personal baseline learning
- Integration with OpenBCI, Muse, and EMOTIV SDKs

---

## What Baseline does not claim

Deviation scores are statistical distances, not clinical indicators.
Labels (stable / mild / moderate / high) are relative to individual history only.
This is not a medical device.

---

*Research prototype · 2025*
