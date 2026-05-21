"""
frontend/pages/upload.py
Upload Data — clean drag-and-drop CSV import.
"""

import io
import streamlit as st
import pandas as pd

from config import FEATURE_COLUMNS, SESSION_COLUMN
from database.db import get_or_create_user, insert_session
from preprocessing.preprocessor import validate_feature_dataframe
from frontend.theme import COLORS, page_header
from frontend.components.cards import callout, section_header, info_card


def render() -> None:
    c = COLORS
    page_header("Upload Data", "Import EEG feature sessions for a subject")

    # ── Required format card ──────────────────────────────────────────────────
    cols_display = f"{SESSION_COLUMN}, " + ", ".join(FEATURE_COLUMNS)
    info_card(
        "Required CSV format",
        f"Your file must contain these columns:<br/>"
        f'<code style="background:rgba(255,255,255,0.06);padding:0.2rem 0.4rem;'
        f'border-radius:4px;font-size:0.82rem;color:{c["accent"]};'
        f'font-family:monospace;">{cols_display}</code><br/><br/>'
        f"Each row represents one EEG session. Values should be band-power features "
        f"(alpha, beta, theta) extracted from temporal channels T7 and T8.",
        icon="≋",
    )

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)

    # ── Subject name ──────────────────────────────────────────────────────────
    section_header("Subject", "Assign this data to a subject")
    subject_name = st.text_input(
        "Subject name",
        placeholder="e.g. alice, subject_01 …",
        label_visibility="collapsed",
    )

    st.markdown("<div style='height:1rem;'></div>", unsafe_allow_html=True)

    # ── File uploader ─────────────────────────────────────────────────────────
    section_header("File", "CSV containing EEG feature sessions")
    uploaded = st.file_uploader(
        "Drop a CSV file here",
        type=["csv"],
        label_visibility="collapsed",
    )

    if uploaded and not subject_name:
        callout("Enter a subject name above before saving.", kind="warning")

    if uploaded:
        try:
            df = pd.read_csv(io.StringIO(uploaded.getvalue().decode("utf-8")))
        except Exception as e:
            callout(f"Failed to parse CSV: {e}", kind="error")
            return

        is_valid, msg = validate_feature_dataframe(df)
        if not is_valid:
            callout(f"Validation failed: {msg}", kind="error")
            return

        # ── Preview ───────────────────────────────────────────────────────────
        callout(
            f"<b>{len(df)} sessions</b> detected — validation passed ✓",
            kind="success",
        )

        with st.expander("Preview data", expanded=True):
            st.dataframe(
                df[FEATURE_COLUMNS].head(10),
                use_container_width=True,
                hide_index=False,
            )

        st.markdown("<div style='height:0.5rem;'></div>", unsafe_allow_html=True)

        if subject_name:
            if st.button("Save sessions to database", type="primary"):
                uid = get_or_create_user(subject_name.strip())
                saved = 0
                for _, row in df.iterrows():
                    features = row[FEATURE_COLUMNS].tolist()
                    tag = str(row[SESSION_COLUMN]) if SESSION_COLUMN in row else ""
                    insert_session(uid, features, session_tag=tag)
                    saved += 1
                callout(
                    f"Saved <b>{saved} sessions</b> for <b>{subject_name}</b>. "
                    "Go to <b>Baseline Profile</b> to build the baseline.",
                    kind="success",
                )
