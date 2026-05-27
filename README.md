# BASELINE

> *Neural signals only become meaningful when interpreted relative to themselves.*

Wearable EEG systems drift across time, making neural models unstable across sessions, environments, and users.

BASELINE explores whether lightweight subject-specific statistical alignment can stabilize EEG feature representations under realistic wearable deployment constraints.

Rather than building a new classifier architecture, BASELINE investigates a more fundamental question:

> Can longitudinal personalization improve robustness in non-stationary neural systems?

---

# Why This Matters

Most machine learning systems assume humans are statistically stable.

Brains are not.

Neural activity changes continuously across:
- fatigue
- sleep
- stress
- attention
- learning
- environment
- electrode placement
- time

This becomes a major problem for wearable neurotechnology.

EEG systems that perform well in controlled laboratory settings often degrade rapidly in real-world deployment because neural feature distributions drift longitudinally.

Future neurotechnology systems — from wearable EEG to brain-computer interfaces — will require adaptive personalization layers capable of tracking evolving neural distributions over time.

BASELINE explores one small piece of that problem.

---

# The Problem

| Problem | Consequence |
|---|---|
| Inter-subject variability | Population models generalize poorly |
| Longitudinal drift | Calibration degrades across sessions |
| Wearable constraints | Low-channel EEG becomes unstable |
| Limited calibration | Long setup procedures are impractical |
| Nonstationarity | Neural feature distributions continuously shift |

---

# Core Hypothesis

> Subject-specific covariance alignment can partially stabilize EEG feature distributions across sessions without requiring retraining of downstream models.

BASELINE operates as a lightweight alignment layer between EEG features and downstream machine learning systems.

---

# System Overview

```text
Raw EEG
   │
   ▼
Feature Extraction
(bandpower, variance, spectral metrics)
   │
   ▼
┌─────────────────────────────────┐
│         BASELINE LAYER          │
│                                 │
│  1. Baseline estimation         │
│     μ, Σ = fit(X_calibration)   │
│                                 │
│  2. Covariance normalization    │
│     z = Σ⁻¹/² (x − μ)           │
│                                 │
│  3. Longitudinal adaptation     │
│     μₜ = (1−α)μₜ₋₁ + αxₜ        │
└─────────────────────────────────┘
   │
   ▼
Aligned feature representation
   │
   ▼
Downstream classifier
```

---

# Interactive Research Labs

BASELINE is designed as an interactive research system rather than a static paper.

---

## 1. Drift Geometry Lab

Visualize how EEG feature distributions drift across sessions.

Compare:
- raw feature embeddings
- covariance-aligned embeddings
- session geometry over time

Explore:
- drift intensity
- noise
- session count
- alignment methods

Key question:

> Does statistical alignment stabilize neural geometry?

---

## 2. Calibration Efficiency Simulator

Investigate how personalization affects calibration burden.

Compare:
- raw pipeline performance
- aligned pipeline performance

Across:
- small calibration sets
- noisy wearable conditions
- longitudinal drift scenarios

Key question:

> Can personalization reduce calibration requirements?

---

## 3. Longitudinal Feature Viewer

Track synthetic EEG feature trajectories across simulated sessions.

Observe:
- alpha drift
- beta instability
- variance expansion
- adaptation behavior

Visualize how BASELINE tracks evolving neural distributions over time.

---

## 4. Personal Drift Experience

A lightweight interactive experiment demonstrating neural instability.

Users complete:
- a short reaction-time task
- multiple simulated sessions
- drift/noise perturbations

The system then visualizes:
- how feature distributions shift across sessions
- how identical users can appear statistically different over time
- how alignment stabilizes representation geometry

The goal is not diagnosis.

The goal is experiential understanding:
> future neural systems cannot assume humans are statistically static.

---

# Central Finding

Evaluated on real EEG data from BNCI Horizon 2020 (dataset 001-2014).

### Experimental Setup

- Subject: A01
- Train session: A01T
- Test session: A01E
- Task: Binary motor imagery
- Channels: C3, C4, CP3, CP4
- Features:
  - theta power
  - alpha power
  - beta power
  - temporal variance
- Classifier: Logistic Regression

### Results

| Method | Feature Shift (L₂) | Accuracy |
|---|---|---|
| Raw | 4.06 | 57.6% |
| Covariance Whitening | 0.22 | 57.6% |
| Moving Adaptation | 0.55 | 51.4% |

Covariance normalization substantially reduced longitudinal feature instability:

> 4.06 → 0.22 (−94.6%)

However:
- reduced drift did not improve decoding accuracy
- stability and discriminative information may be partially decoupled

This became the central research insight of the project.

---

# What BASELINE Suggests

BASELINE does not claim to solve EEG decoding.

Instead, it suggests that:

- longitudinal adaptation may be necessary for future neurotechnology systems
- statistical stability alone may not guarantee decoding robustness
- wearable EEG deployment requires personalization-aware infrastructure
- future human-centered AI systems may require adaptive representations rather than static user models

---

# Drift Geometry

One of the central ideas explored in BASELINE is that neural feature geometry changes across time.

Without adaptation:
- session distributions separate
- embeddings drift
- calibration degrades
- decision boundaries destabilize

With alignment:
- feature distributions contract
- session geometry stabilizes
- longitudinal variance decreases

Yet:
- improved statistical stability does not necessarily imply improved decoding performance

This dissociation is one of the most important findings in the project.

---

# Research Positioning

BASELINE sits at the intersection of:

- longitudinal representation learning
- domain adaptation
- non-stationary biosignal processing
- wearable EEG deployment
- calibration-efficient BCI systems
- adaptive human-centered AI

---

# Technical Stack

## Frontend
- Next.js
- React
- TypeScript
- Plotly.js
- TailwindCSS
- Framer Motion

## Backend
- Python
- NumPy
- SciPy
- Scikit-learn
- MNE

## Core Methods
- covariance whitening
- z-score normalization
- moving-average adaptation
- synthetic longitudinal drift simulation
- PCA / t-SNE embedding analysis

---

# Repository Structure

```text
baseline/
├── adaptation/
├── evaluation/
├── experiments/
├── features/
├── frontend/
├── sdk/
├── synthetic/
├── visualization/
├── app.py
└── config.py
```

---

# Design Philosophy

BASELINE is intentionally designed as:
- a research visualization system
- an interactive computational neuroscience prototype
- a deployment-oriented investigation

It is not:
- a wellness product
- a cognitive enhancement platform
- a medical system
- a “brain AI” application

The project prioritizes:
- scientific clarity
- longitudinal realism
- interpretability
- deployment constraints
- adaptive personalization

---

# Limitations

- Single-subject real-data evaluation
- Limited wearable simulation
- No deep representation learning
- Small-scale adaptation methods
- Research prototype only

BASELINE is not:
- a medical device
- a diagnostic system
- a cognitive assessment tool

---

# Future Directions

BASELINE currently explores lightweight statistical alignment under constrained wearable EEG conditions.

Longer-term, this work points toward a broader question:

> How should future neurotechnology systems adapt to humans as continuously evolving biological distributions rather than static users?

Potential future directions include:

## Continuous Neural Adaptation
Systems capable of updating personal neural representations longitudinally without requiring explicit recalibration sessions.

## Calibration-Light Wearable Neurotechnology
Wearable EEG systems designed around passive adaptation and minimal user burden.

## Persistent Personal Neural Embeddings
Long-term subject-specific neural representation spaces capable of tracking gradual cognitive and physiological change across months or years.

## Uncertainty-Aware Neural Interfaces
Adaptive systems that estimate signal reliability, confidence, and drift in real time under noisy real-world conditions.

## Hardware / Software Co-Design
Wearable neurotechnology designed jointly with adaptive alignment infrastructure rather than treating signal instability purely as a post-processing problem.

## Federated Personalization
Privacy-preserving personalization systems allowing wearable neural devices to improve longitudinally without centralized storage of raw neural data.

## Toward Adaptive Human-Centered AI
More broadly, BASELINE explores whether future AI systems interacting with biological humans may require temporally adaptive representations rather than static assumptions about users.

---

# Citation

```bibtex
@misc{kesek2026baseline,
  title={BASELINE: Lightweight Subject-Specific Feature Alignment for Longitudinal Wearable EEG},
  author={Kesek, Oyku Nur},
  year={2026}
}
```

---

# Final Thought

Future neural systems cannot assume humans are static distributions.

BASELINE explores what happens when machine learning systems begin adapting to the temporal instability of real human signals.