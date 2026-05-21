"""
frontend/pages/dashboard.py
Dashboard — hero landing page with metrics and synthetic data generator.
"""

import streamlit as st
import pandas as pd

from database.db import (
    list_users, get_sessions_for_user, get_or_create_user,
    load_baseline, insert_session,
)
from utils.synthetic import generate_all_subjects
from config import FEATURE_COLUMNS, SESSION_COLUMN
from frontend.theme import COLORS, page_header
from frontend.components.cards import stat_card, section_header, callout


def render() -> None:
    c = COLORS

    # ── Hero ──────────────────────────────────────────────────────────────────
    st.markdown(f"""
    <div style="
        background: linear-gradient(135deg,
            rgba(0,212,255,0.06) 0%,
            rgba(124,58,237,0.04) 50%,
            rgba(0,0,0,0) 100%);
        border: 1px solid {c['border']};
        border-radius: 20px;
        padding: 2.5rem 3rem;
        margin-bottom: 2rem;
        position: relative;
        overflow: hidden;
    ">
      <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;
                  background:radial-gradient(circle, {c['accent']}12, transparent 70%);
                  border-radius:50%;"></div>
      <div style="position:absolute;bottom:-30px;right:80px;width:120px;height:120px;
                  background:radial-gradient(circle, {c['accent2']}10, transparent 70%);
                  border-radius:50%;"></div>
      <div style="font-size:0.7rem;font-weight:700;letter-spacing:2.5px;
                  color:{c['accent']};text-transform:uppercase;margin-bottom:0.75rem;">
        Neural Baseline System
      </div>
      <div style="font-size:2.4rem;font-weight:700;letter-spacing:-1.5px;
                  color:{c['text']};line-height:1.15;margin-bottom:0.5rem;">
        baseline
      </div>
      <div style="font-size:1rem;color:{c['text2']};font-weight:400;margin-bottom:0.5rem;">
        Your brain, modeled against itself.
      </div>
      <div style="font-size:0.82rem;color:{c['text3']};max-width:480px;line-height:1.6;">
        Detect cognitive state changes as statistical deviations from your personal
        neural equilibrium — not population averages.
      </div>
    </div>
    """, unsafe_allow_html=True)

    # ── Metrics ───────────────────────────────────────────────────────────────
    users = list_users()
    total_sessions = 0
    baselines_built = 0
    subject_rows = []

    for u in users:
        uid = get_or_create_user(u)
        df = get_sessions_for_user(uid)
        n = len(df)
        total_sessions += n
        bl = load_baseline(uid)
        has_bl = bl is not None
        if has_bl:
            baselines_built += 1
        subject_rows.append({
            "Subject":        u,
            "Sessions":       n,
            "Baseline":       "✓  Built" if has_bl else "—  Pending",
            "Last Updated":   str(bl["updated_at"])[:16] if has_bl else "—",
        })

    coverage = int(baselines_built / len(users) * 100) if users else 0

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        stat_card(len(users), "Subjects", "⬡", color="accent")
    with col2:
        stat_card(total_sessions, "Sessions", "∿", color="blue")
    with col3:
        stat_card(baselines_built, "Baselines", "◎", color="green")
    with col4:
        stat_card(f"{coverage}%", "Coverage", "⊕",
                  color="green" if coverage == 100 else ("amber" if coverage > 0 else "text"))

    st.markdown("<div style='height:1.5rem;'></div>", unsafe_allow_html=True)

    # ── Subject table ──────────────────────────────────────────────────────────
    if subject_rows:
        section_header("Subject Overview", "All registered subjects and their baseline status")
        with st.expander("View subject table", expanded=len(users) <= 5):
            st.dataframe(
                pd.DataFrame(subject_rows),
                use_container_width=True,
                hide_index=True,
            )
    else:
        callout(
            "No subjects yet — generate synthetic demo data below, or upload a CSV in "
            "<b>Upload Data</b>.",
            kind="info",
        )

    st.markdown(f'<div style="height:1px;background:{c["border"]};margin:2rem 0;"></div>',
                unsafe_allow_html=True)

    # ── Synthetic data generator ───────────────────────────────────────────────
    section_header(
        "Generate Demo Data",
        "Populate the database with three synthetic subjects for exploration",
    )

    col_s, col_c, col_b = st.columns([2, 1, 1])
    with col_s:
        n_sessions = st.slider(
            "Sessions per subject", min_value=10, max_value=60, value=30, step=5
        )
    with col_c:
        include_shift = st.checkbox(
            "Cognitive state shift",
            value=False,
            help="Subject C will show a simulated alpha-suppression epoch after session 18.",
        )
    with col_b:
        st.markdown("<div style='height:1.8rem;'></div>", unsafe_allow_html=True)
        generate = st.button("Generate Demo Data", type="primary", use_container_width=True)

    if generate:
        datasets = generate_all_subjects(
            n_sessions=n_sessions,
            include_shift=include_shift,
        )
        total_inserted = 0
        for name, df in datasets.items():
            uid = get_or_create_user(name)
            for _, row in df.iterrows():
                features = row[FEATURE_COLUMNS].tolist()
                tag = str(row[SESSION_COLUMN])
                insert_session(uid, features, session_tag=tag)
                total_inserted += 1

        callout(
            f"Loaded <b>{total_inserted}</b> sessions across <b>{len(datasets)}</b> subjects. "
            "Go to <b>Baseline Profile</b> to compute baselines.",
            kind="success",
        )
        st.rerun()
