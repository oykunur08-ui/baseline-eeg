"""
frontend/pages/methodology.py
Methodology — the science behind Baseline, as a clean article.
"""

import streamlit as st
from frontend.theme import COLORS, page_header
from frontend.components.cards import callout, section_header


def render() -> None:
    c = COLORS
    page_header("Methodology", "The scientific and statistical foundations of Baseline")

    callout(
        "Baseline is not a medical diagnostic tool. All outputs are statistical measures "
        "relative to an individual's own history — not clinical reference ranges.",
        kind="warning",
    )

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)

    # ── Why personalized ──────────────────────────────────────────────────────
    section_header("Why Personalized Baselines?")
    st.markdown(f"""
<div style="color:{c['text2']};font-size:0.9rem;line-height:1.8;max-width:720px;">
Standard EEG classifiers are trained on data pooled across many individuals.
This creates a fundamental problem: <span style="color:{c['text']};font-weight:600;">
inter-subject variability</span> in resting-state EEG is large enough that a
"high alpha" reading for one person may be perfectly normal for another.<br/><br/>
Baseline addresses this by learning each individual's own neural distribution
and measuring new sessions as deviations from that personal reference point.
</div>
""", unsafe_allow_html=True)

    st.markdown("<div style='height:1.5rem;'></div>", unsafe_allow_html=True)

    # ── Pipeline ──────────────────────────────────────────────────────────────
    section_header("Pipeline")

    steps = [
        ("Step 1 — Baseline Learning",
         f"From a subject's sessions (minimum 5), the system computes:<br/>"
         f"<span style='color:{c['text']};font-weight:600;'>μ</span> — the feature mean vector "
         f"(one value per EEG band × channel pair)<br/>"
         f"<span style='color:{c['text']};font-weight:600;'>Σ</span> — the regularized sample covariance matrix<br/><br/>"
         f"A regularization term <em>λI</em> is added to the diagonal of Σ "
         f"(Tikhonov regularization) to guarantee invertibility with limited sessions."),
        ("Step 2 — New Session Input",
         "A new session is represented as the same feature vector <b>x</b>, "
         "extracted with identical preprocessing steps. Dimensional consistency is enforced."),
        ("Step 3 — Mahalanobis Distance",
         f"The deviation of <b>x</b> from the baseline:<br/>"
         f'<div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);'
         f'border-radius:8px;padding:0.75rem 1.25rem;margin:0.75rem 0;font-family:monospace;'
         f'font-size:0.9rem;color:{c["accent"]};">'
         f"D(x) = √( (x − μ)ᵀ Σ⁻¹ (x − μ) )</div>"
         f"Unlike Euclidean distance, Mahalanobis distance accounts for feature scale "
         f"differences (via Σ⁻¹), feature correlations, and is dimensionless — "
         f"comparable across individuals."),
        ("Step 4 — Feature-level Explanation",
         f"Per-feature z-scores decompose the deviation:<br/>"
         f'<div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);'
         f'border-radius:8px;padding:0.75rem 1.25rem;margin:0.75rem 0;font-family:monospace;'
         f'font-size:0.9rem;color:{c["accent"]};">'
         f"z_i = (x_i − μ_i) / σ_i,  where σ_i = √Σᵢᵢ</div>"
         f"Features are ranked by |z_i| to explain which dimensions drove the anomaly."),
    ]

    for title, body in steps:
        st.markdown(f"""
<div style="background:{c['bg_card']};border:1px solid {c['border']};border-radius:14px;
            padding:1.25rem 1.5rem;margin:0.75rem 0;">
  <div style="color:{c['text']};font-size:0.9rem;font-weight:600;margin-bottom:0.5rem;">
    {title}</div>
  <div style="color:{c['text2']};font-size:0.85rem;line-height:1.7;">{body}</div>
</div>
""", unsafe_allow_html=True)

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)

    # ── Features table ────────────────────────────────────────────────────────
    section_header("EEG Features Used")

    rows = [
        ("alpha_T7, alpha_T8", "Alpha band power (8–13 Hz)", "Temporal channels T7/T8"),
        ("beta_T7, beta_T8",   "Beta band power (13–30 Hz)", "Cortical arousal proxy"),
        ("theta_T7, theta_T8", "Theta band power (4–8 Hz)",  "Cognitive load proxy"),
        ("alpha_asymmetry",    "log(alpha_T8) − log(alpha_T7)", "Lateralization index"),
        ("theta/alpha ratio",  "Theta ÷ Alpha average",      "Elevated = higher load"),
        ("beta/alpha ratio",   "Beta ÷ Alpha average",       "Elevated = more arousal"),
    ]

    rows_html = ""
    for i, (feat, desc, note) in enumerate(rows):
        bg = c["bg_card2"] if i % 2 == 0 else "transparent"
        rows_html += f"""
<tr style="background:{bg};">
  <td style="padding:0.5rem 0.75rem;font-family:monospace;font-size:0.8rem;
             color:{c['accent']};white-space:nowrap;">{feat}</td>
  <td style="padding:0.5rem 0.75rem;color:{c['text2']};font-size:0.85rem;">{desc}</td>
  <td style="padding:0.5rem 0.75rem;color:{c['text3']};font-size:0.82rem;">{note}</td>
</tr>"""

    st.markdown(f"""
<div style="background:{c['bg_card']};border:1px solid {c['border']};
            border-radius:14px;overflow:hidden;margin:0.5rem 0;">
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="border-bottom:1px solid {c['border']};">
        <th style="padding:0.6rem 0.75rem;text-align:left;color:{c['text3']};
                   font-size:0.7rem;font-weight:600;letter-spacing:0.8px;
                   text-transform:uppercase;">Feature</th>
        <th style="padding:0.6rem 0.75rem;text-align:left;color:{c['text3']};
                   font-size:0.7rem;font-weight:600;letter-spacing:0.8px;
                   text-transform:uppercase;">Description</th>
        <th style="padding:0.6rem 0.75rem;text-align:left;color:{c['text3']};
                   font-size:0.7rem;font-weight:600;letter-spacing:0.8px;
                   text-transform:uppercase;">Note</th>
      </tr>
    </thead>
    <tbody>{rows_html}</tbody>
  </table>
</div>
""", unsafe_allow_html=True)

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)

    # ── Population model ──────────────────────────────────────────────────────
    section_header("Population Model Comparison")
    st.markdown(f"""
<div style="color:{c['text2']};font-size:0.9rem;line-height:1.8;max-width:720px;">
The <span style="color:{c['text']};font-weight:600;">population model</span> builds a single
μ and Σ from all subjects combined — the standard approach in many EEG pipelines.<br/><br/>
Baseline demonstrates that this pooled model produces systematically different deviation
scores than the personal model, often in the wrong direction. Two individuals with opposite
alpha patterns would both appear "abnormal" under a model tuned to neither of them.
</div>
""", unsafe_allow_html=True)

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)

    # ── Disclaimer ────────────────────────────────────────────────────────────
    section_header("What Baseline Does Not Claim")
    callout(
        "· Not a medical diagnostic tool<br/>"
        "· Mahalanobis distance is a statistical measure, not a clinical one<br/>"
        "· Labels (stable / mild / moderate / high) are relative to individual history only<br/>"
        "· No causal claims are made about neural mechanisms",
        kind="warning",
    )
