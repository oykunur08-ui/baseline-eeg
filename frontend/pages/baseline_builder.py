"""
frontend/pages/baseline_builder.py
Baseline Profile — compute and visualize personal neural baseline.
"""

import streamlit as st
import pandas as pd
import numpy as np

from database.db import (
    list_users, get_or_create_user, get_sessions_for_user,
    save_baseline, load_baseline,
)
from core.baseline_engine import build_baseline, compute_stability_index
from visualization.plots import baseline_radar, feature_distribution_plot
from frontend.components.charts import apply_chart_theme
from config import FEATURE_COLUMNS, MIN_BASELINE_SESSIONS
from frontend.theme import COLORS, page_header
from frontend.components.cards import stat_card, section_header, callout
from frontend.components.metrics import stability_gauge


def render() -> None:
    c = COLORS
    page_header(
        "Baseline Profile",
        "Neural Identity Profile — your statistical neural equilibrium",
    )

    users = list_users()
    if not users:
        callout(
            "No subjects found. Upload data in <b>Upload Data</b> "
            "or generate demo data from the <b>Dashboard</b>.",
            kind="info",
        )
        return

    subject = st.selectbox("Select subject", users, label_visibility="collapsed")
    uid = get_or_create_user(subject)
    session_df = get_sessions_for_user(uid)

    if session_df.empty:
        callout("No sessions found for this subject.", kind="warning")
        return

    feature_rows = pd.DataFrame(session_df["features"].tolist(), columns=FEATURE_COLUMNS)
    existing = load_baseline(uid)
    si = compute_stability_index(existing["cov"]) if existing else None

    # ── Metrics row ──────────────────────────────────────────────────────────
    col1, col2, col3, col_gauge = st.columns([1, 1, 1, 1])
    with col1:
        stat_card(len(feature_rows), "Sessions", "∿", color="blue")
    with col2:
        stat_card(len(FEATURE_COLUMNS), "Features", "◈", color="accent")
    with col3:
        stat_card(
            "Built" if existing else "Pending",
            "Baseline",
            "◎",
            color="green" if existing else "amber",
        )
    with col_gauge:
        if si is not None:
            stability_gauge(si)
        else:
            stat_card("—", "Stability", "⊕", color="text")

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)

    if existing:
        callout(
            f"Baseline built from <b>{existing['n_sessions']} sessions</b>. "
            f"Stability index: <b>{si:.3f}</b>. "
            f"Last updated: {str(existing['updated_at'])[:16]}.",
            kind="success",
        )

    # ── Session preview ───────────────────────────────────────────────────────
    with st.expander("Session data preview"):
        st.dataframe(feature_rows.head(10), use_container_width=True)

    st.markdown("<div style='height:0.5rem;'></div>", unsafe_allow_html=True)

    # ── Build button ──────────────────────────────────────────────────────────
    if st.button("Compute / update baseline", type="primary"):
        profile = build_baseline(feature_rows, user_name=subject)
        if profile is None:
            callout(
                f"Not enough sessions. Need at least {MIN_BASELINE_SESSIONS}, "
                f"found {len(feature_rows)}.",
                kind="error",
            )
            return

        save_baseline(uid, profile.mean, profile.cov, profile.n_sessions)
        callout(
            f"Baseline saved — <b>{profile.n_sessions} sessions</b>, "
            f"stability index: <b>{profile.stability_index:.3f}</b>.",
            kind="success",
        )

        st.markdown(f'<div style="height:1px;background:{c["border"]};margin:2rem 0;"></div>',
                    unsafe_allow_html=True)
        section_header("Neural Identity Profile", "Baseline mean vector across EEG features")

        col_r, col_d = st.columns([1, 1])
        with col_r:
            fig = apply_chart_theme(baseline_radar(profile))
            st.plotly_chart(fig, use_container_width=True)
        with col_d:
            feat = st.selectbox("Feature distribution", FEATURE_COLUMNS)
            fig2 = apply_chart_theme(feature_distribution_plot(feature_rows, profile, feat))
            st.plotly_chart(fig2, use_container_width=True)

    elif existing:
        # Show existing baseline visuals without re-computing
        from scipy.linalg import inv
        from core.baseline_engine import BaselineProfile

        profile = BaselineProfile(
            user_name=subject,
            mean=existing["mean"],
            cov=existing["cov"],
            cov_inv=inv(existing["cov"]),
            n_sessions=existing["n_sessions"],
            feature_names=FEATURE_COLUMNS,
            stability_index=si,
        )

        st.markdown(f'<div style="height:1px;background:{c["border"]};margin:2rem 0;"></div>',
                    unsafe_allow_html=True)
        section_header("Neural Identity Profile", "Baseline mean vector across EEG features")

        col_r, col_d = st.columns([1, 1])
        with col_r:
            fig = apply_chart_theme(baseline_radar(profile))
            st.plotly_chart(fig, use_container_width=True)
        with col_d:
            feat = st.selectbox("Feature distribution", FEATURE_COLUMNS)
            fig2 = apply_chart_theme(feature_distribution_plot(feature_rows, profile, feat))
            st.plotly_chart(fig2, use_container_width=True)
