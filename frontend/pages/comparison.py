"""
frontend/pages/comparison.py
Population vs Personal — the scientific thesis demonstration page.
"""

import streamlit as st
import pandas as pd
import numpy as np
from scipy.linalg import inv

from database.db import list_users, get_or_create_user, load_baseline, get_sessions_for_user
from core.baseline_engine import BaselineProfile, compute_stability_index, build_baseline
from core.deviation_engine import compute_deviation
from models.population_model import build_population_baseline, compare_personal_vs_population
from visualization.plots import population_vs_personal_chart, multi_subject_mean_comparison
from frontend.components.charts import apply_chart_theme
from frontend.components.cards import callout, section_header, stat_card
from frontend.theme import COLORS, page_header
from config import FEATURE_COLUMNS


def _load_profile(uid: int, name: str) -> BaselineProfile | None:
    bl = load_baseline(uid)
    if bl is None:
        return None
    return BaselineProfile(
        user_name=name,
        mean=bl["mean"],
        cov=bl["cov"],
        cov_inv=inv(bl["cov"]),
        n_sessions=bl["n_sessions"],
        feature_names=FEATURE_COLUMNS,
        stability_index=compute_stability_index(bl["cov"]),
    )


def render() -> None:
    c = COLORS
    page_header(
        "Population vs Personal",
        "Why one brain cannot represent all brains",
    )

    callout(
        "Population models smooth out individual variability — "
        "personalization restores signal clarity.",
        kind="neural",
    )

    users = list_users()
    if len(users) < 2:
        callout(
            "Need at least 2 subjects with baselines. "
            "Generate demo data from the <b>Dashboard</b> first.",
            kind="info",
        )
        return

    personal_profiles: dict[str, BaselineProfile] = {}
    subject_dataframes: dict[str, pd.DataFrame] = {}

    for u in users:
        uid = get_or_create_user(u)
        profile = _load_profile(uid, u)
        session_df = get_sessions_for_user(uid)
        if profile is not None and not session_df.empty:
            personal_profiles[u] = profile
            subject_dataframes[u] = pd.DataFrame(
                session_df["features"].tolist(), columns=FEATURE_COLUMNS
            )

    if len(personal_profiles) < 2:
        callout(
            "Build baselines for at least 2 subjects in <b>Baseline Profile</b> first.",
            kind="warning",
        )
        return

    # ── Inter-subject variability ─────────────────────────────────────────────
    section_header(
        "Inter-subject Baseline Variability",
        "Each brain has a meaningfully different feature mean — a population average (dashed) "
        "cannot represent any individual faithfully.",
    )
    fig_multi = apply_chart_theme(multi_subject_mean_comparison(personal_profiles))
    st.plotly_chart(fig_multi, use_container_width=True)

    st.markdown(f'<div style="height:1px;background:{c["border"]};margin:2rem 0;"></div>',
                unsafe_allow_html=True)

    # ── Build population model ────────────────────────────────────────────────
    pop_profile = build_population_baseline(subject_dataframes)

    section_header(
        "Deviation Comparison",
        "Same sessions, different baseline — the discrepancy is what population models hide.",
    )

    subject = st.selectbox(
        "Select subject to analyze",
        list(personal_profiles.keys()),
        label_visibility="collapsed",
    )
    personal = personal_profiles[subject]
    df = subject_dataframes[subject]

    personal_dists, population_dists, indices = [], [], []
    for i, (_, row) in enumerate(df.iterrows()):
        x = row[FEATURE_COLUMNS].values.astype(float)
        cmp = compare_personal_vs_population(x, personal, pop_profile)
        personal_dists.append(cmp.personal_result.mahal_distance)
        population_dists.append(cmp.population_result.mahal_distance)
        indices.append(i)

    fig_cmp = apply_chart_theme(
        population_vs_personal_chart(indices, personal_dists, population_dists)
    )
    st.plotly_chart(fig_cmp, use_container_width=True)

    # ── Insight metrics ───────────────────────────────────────────────────────
    mean_personal = float(np.mean(personal_dists))
    mean_pop      = float(np.mean(population_dists))
    diff          = abs(mean_pop - mean_personal)

    col1, col2, col3 = st.columns(3)
    with col1:
        stat_card(f"{mean_personal:.2f}", "Personal baseline D(x)", "◎", color="accent")
    with col2:
        stat_card(f"{mean_pop:.2f}", "Population baseline D(x)", "⬡", color="text")
    with col3:
        stat_card(f"{diff:.2f}", "Model discrepancy", "⊕",
                  color="red" if diff > 1.0 else "amber")

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)
    callout(
        f"<b>{subject}</b> — A discrepancy of <b>{diff:.2f}</b> between models means the "
        "population baseline systematically misrepresents this individual's neural state. "
        "Larger discrepancy = worse fit of population model for this person.",
        kind="info",
    )
