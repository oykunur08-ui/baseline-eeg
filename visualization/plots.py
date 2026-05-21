"""
visualization/plots.py
All Plotly visualizations for Baseline.
Each function returns a plotly Figure object ready for st.plotly_chart().
Design: scientific, minimal, dark-friendly.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots

from config import FEATURE_COLUMNS, DEVIATION_THRESHOLDS
from core.baseline_engine import BaselineProfile
from core.deviation_engine import DeviationResult


# ── Color palette ──────────────────────────────────────────────────────────
COLORS = {
    "primary":   "#4F8EF7",
    "secondary": "#A78BFA",
    "stable":    "#34D399",
    "mild":      "#FBBF24",
    "moderate":  "#F97316",
    "high":      "#EF4444",
    "neutral":   "#6B7280",
    "bg":        "rgba(0,0,0,0)",
}

DEVIATION_COLORS = {
    "stable":   COLORS["stable"],
    "mild":     COLORS["mild"],
    "moderate": COLORS["moderate"],
    "high":     COLORS["high"],
}

LAYOUT_BASE = dict(
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(family="Inter, system-ui, sans-serif", size=12),
    margin=dict(l=40, r=40, t=50, b=40),
)


# ── 1. Baseline Radar Plot ─────────────────────────────────────────────────

def baseline_radar(
    profile: BaselineProfile,
    new_vector: np.ndarray | None = None,
) -> go.Figure:
    """
    Radar/spider chart showing the baseline mean vector and optionally
    the new session vector for visual comparison.
    """
    features = profile.feature_names
    mu = profile.mean.tolist()

    fig = go.Figure()
    fig.add_trace(go.Scatterpolar(
        r=mu + [mu[0]],
        theta=features + [features[0]],
        fill="toself",
        fillcolor=f"rgba(79,142,247,0.15)",
        line=dict(color=COLORS["primary"], width=2),
        name="Baseline μ",
    ))

    if new_vector is not None:
        nv = new_vector.tolist()
        fig.add_trace(go.Scatterpolar(
            r=nv + [nv[0]],
            theta=features + [features[0]],
            fill="toself",
            fillcolor="rgba(167,139,250,0.12)",
            line=dict(color=COLORS["secondary"], width=2, dash="dash"),
            name="New session",
        ))

    fig.update_layout(
        **LAYOUT_BASE,
        title=dict(text="Feature baseline profile", font=dict(size=14)),
        polar=dict(
            radialaxis=dict(visible=True, showticklabels=True, gridcolor="rgba(150,150,150,0.2)"),
            angularaxis=dict(gridcolor="rgba(150,150,150,0.2)"),
            bgcolor="rgba(0,0,0,0)",
        ),
        showlegend=True,
        legend=dict(orientation="h", y=-0.15),
    )
    return fig


# ── 2. Deviation Heatmap ───────────────────────────────────────────────────

def deviation_heatmap(deviation_series: pd.DataFrame) -> go.Figure:
    """
    Heatmap of per-feature z-scores over time.
    Columns = features, rows = sessions.
    Color scale: blue (negative deviation) → white → red (positive deviation).
    """
    z_cols = [c for c in deviation_series.columns if c.startswith("z_")]
    if not z_cols:
        return go.Figure()

    z_data  = deviation_series[z_cols].values.T
    feat_labels = [c.replace("z_", "") for c in z_cols]
    session_ids = deviation_series["session_index"].astype(str).tolist()

    fig = go.Figure(go.Heatmap(
        z=z_data,
        x=session_ids,
        y=feat_labels,
        colorscale="RdBu_r",
        zmid=0,
        colorbar=dict(title="z-score", thickness=12),
    ))
    fig.update_layout(
        **LAYOUT_BASE,
        title=dict(text="Feature z-score deviation over sessions", font=dict(size=14)),
        xaxis=dict(title="Session", showgrid=False),
        yaxis=dict(title="Feature", showgrid=False),
    )
    return fig


# ── 3. Longitudinal Drift Graph ────────────────────────────────────────────

def longitudinal_drift(deviation_series: pd.DataFrame) -> go.Figure:
    """
    Line chart of Mahalanobis distance over time.
    Threshold bands are drawn as shaded background regions.
    """
    fig = go.Figure()

    # Threshold bands
    threshold_values = list(DEVIATION_THRESHOLDS.values())
    band_names = list(DEVIATION_THRESHOLDS.keys())
    band_colors = {
        "stable":   "rgba(52,211,153,0.08)",
        "mild":     "rgba(251,191,36,0.08)",
        "moderate": "rgba(249,115,22,0.08)",
        "high":     "rgba(239,68,68,0.08)",
    }

    prev = 0.0
    for label, (lo, hi) in DEVIATION_THRESHOLDS.items():
        hi_plot = hi if hi != float("inf") else deviation_series["mahal_distance"].max() * 1.3
        fig.add_hrect(
            y0=lo, y1=hi_plot,
            fillcolor=band_colors[label],
            line_width=0,
            annotation_text=label,
            annotation_position="right",
            annotation_font_size=10,
        )

    # Main line
    fig.add_trace(go.Scatter(
        x=deviation_series["session_index"],
        y=deviation_series["mahal_distance"],
        mode="lines+markers",
        line=dict(color=COLORS["primary"], width=2),
        marker=dict(
            size=7,
            color=deviation_series["deviation_label"].map(DEVIATION_COLORS),
            line=dict(width=1, color="white"),
        ),
        name="Mahalanobis distance",
        hovertemplate="Session %{x}<br>D = %{y:.2f}<extra></extra>",
    ))

    fig.update_layout(
        **LAYOUT_BASE,
        title=dict(text="Longitudinal deviation drift", font=dict(size=14)),
        xaxis=dict(title="Session index", showgrid=False),
        yaxis=dict(title="Mahalanobis distance D(x)", showgrid=True,
                   gridcolor="rgba(150,150,150,0.15)"),
    )
    return fig


# ── 4. Feature Contribution Bar Chart ─────────────────────────────────────

def feature_contribution_bars(result: DeviationResult) -> go.Figure:
    """
    Horizontal bar chart ranking features by their absolute z-score.
    Color encodes sign: positive (warm) vs negative (cool) deviation.
    """
    features = [f for f, _ in result.feature_contributions]
    abs_z    = [z for _, z in result.feature_contributions]
    raw_z    = [result.z_scores[f] for f in features]
    colors   = [COLORS["moderate"] if z > 0 else COLORS["primary"] for z in raw_z]

    fig = go.Figure(go.Bar(
        x=abs_z,
        y=features,
        orientation="h",
        marker_color=colors,
        text=[f"{z:+.2f}" for z in raw_z],
        textposition="outside",
        hovertemplate="%{y}: |z| = %{x:.2f}<extra></extra>",
    ))
    fig.update_layout(
        **LAYOUT_BASE,
        title=dict(text="Feature contributions to deviation", font=dict(size=14)),
        xaxis=dict(title="|z-score|", showgrid=True, gridcolor="rgba(150,150,150,0.15)"),
        yaxis=dict(showgrid=False),
        showlegend=False,
    )
    return fig


# ── 5. Population vs Personal Comparison ──────────────────────────────────

def population_vs_personal_chart(
    session_indices: list[int],
    personal_distances: list[float],
    population_distances: list[float],
) -> go.Figure:
    """
    Dual-line chart overlaying personal and population Mahalanobis distances
    for the same subject over time.

    The divergence between the two lines is the key scientific insight:
    population baselines misrepresent individual states.
    """
    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=session_indices,
        y=personal_distances,
        mode="lines+markers",
        name="Personal baseline",
        line=dict(color=COLORS["primary"], width=2.5),
        marker=dict(size=6),
    ))

    fig.add_trace(go.Scatter(
        x=session_indices,
        y=population_distances,
        mode="lines+markers",
        name="Population baseline",
        line=dict(color=COLORS["high"], width=2, dash="dot"),
        marker=dict(size=6, symbol="diamond"),
    ))

    fig.update_layout(
        **LAYOUT_BASE,
        title=dict(text="Personal vs population deviation model", font=dict(size=14)),
        xaxis=dict(title="Session index", showgrid=False),
        yaxis=dict(title="Mahalanobis distance D(x)", showgrid=True,
                   gridcolor="rgba(150,150,150,0.15)"),
        legend=dict(orientation="h", y=1.1),
    )
    return fig


# ── 6. Baseline Distribution Plot ─────────────────────────────────────────

def feature_distribution_plot(
    df: pd.DataFrame,
    profile: BaselineProfile,
    feature: str,
) -> go.Figure:
    """
    Histogram of a single feature's distribution across baseline sessions,
    with the baseline mean and ±1σ / ±2σ bands overlaid.
    """
    vals = df[feature].dropna().values
    mu   = profile.mean[profile.feature_names.index(feature)]
    sig  = np.sqrt(profile.cov[
        profile.feature_names.index(feature),
        profile.feature_names.index(feature)
    ])

    fig = go.Figure()

    fig.add_trace(go.Histogram(
        x=vals,
        nbinsx=15,
        marker_color=f"rgba(79,142,247,0.4)",
        marker_line_color=COLORS["primary"],
        marker_line_width=1,
        name="Session distribution",
    ))

    for n_sigma, opacity, label in [(1, 0.15, "±1σ"), (2, 0.08, "±2σ")]:
        fig.add_vrect(
            x0=mu - n_sigma * sig,
            x1=mu + n_sigma * sig,
            fillcolor=COLORS["primary"],
            opacity=opacity,
            line_width=0,
            annotation_text=label,
            annotation_position="top left",
            annotation_font_size=10,
        )

    fig.add_vline(x=mu, line_color=COLORS["primary"], line_width=2,
                  annotation_text="μ", annotation_position="top right")

    fig.update_layout(
        **LAYOUT_BASE,
        title=dict(text=f"Baseline distribution: {feature}", font=dict(size=14)),
        xaxis=dict(title=feature, showgrid=False),
        yaxis=dict(title="Count", showgrid=True, gridcolor="rgba(150,150,150,0.15)"),
        showlegend=False,
    )
    return fig


# ── 7. Multi-subject Mean Comparison ──────────────────────────────────────

def multi_subject_mean_comparison(
    profiles: dict[str, BaselineProfile],
) -> go.Figure:
    """
    Grouped bar chart comparing baseline mean vectors across subjects.
    Visually demonstrates inter-subject variability — the core reason
    population models fail.
    """
    feature_names = FEATURE_COLUMNS
    palette = [COLORS["primary"], COLORS["secondary"], COLORS["stable"],
               COLORS["mild"], COLORS["moderate"]]

    fig = go.Figure()
    for i, (name, profile) in enumerate(profiles.items()):
        fig.add_trace(go.Bar(
            name=name,
            x=feature_names,
            y=profile.mean.tolist(),
            marker_color=palette[i % len(palette)],
            error_y=dict(
                type="data",
                array=np.sqrt(np.diag(profile.cov)).tolist(),
                visible=True,
                color="rgba(150,150,150,0.5)",
                thickness=1.5,
            ),
        ))

    fig.update_layout(
        **LAYOUT_BASE,
        title=dict(text="Baseline mean ± std per subject", font=dict(size=14)),
        barmode="group",
        xaxis=dict(title="Feature", showgrid=False),
        yaxis=dict(title="Mean value", showgrid=True,
                   gridcolor="rgba(150,150,150,0.15)"),
        legend=dict(orientation="h", y=1.1),
    )
    return fig