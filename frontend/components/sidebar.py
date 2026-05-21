"""
frontend/components/sidebar.py
Branded sidebar with logo and styled navigation.
"""

import streamlit as st
from frontend.theme import COLORS

NAV_ITEMS = [
    ("Dashboard",                 "⬡"),
    ("Upload Data",               "↑"),
    ("Baseline Profile",          "◎"),
    ("Neural Deviation Analysis", "∿"),
    ("Population vs Personal",    "⊕"),
    ("Insights & Explainability", "◈"),
    ("Methodology",               "≋"),
]

DISPLAY_TO_KEY = {
    "Dashboard":                 "Dashboard",
    "Upload Data":               "Upload Data",
    "Baseline Profile":          "Baseline Profile",
    "Neural Deviation Analysis": "Neural Deviation Analysis",
    "Population vs Personal":    "Population vs Personal",
    "Insights & Explainability": "Insights & Explainability",
    "Methodology":               "Methodology",
}


def render_sidebar() -> str:
    c = COLORS

    st.sidebar.markdown(f"""
    <div style="padding:0 0.5rem 1.5rem 0.5rem;">
      <div style="font-size:1.5rem;font-weight:700;letter-spacing:-1px;
                  color:{c['text']};line-height:1;">baseline</div>
      <div style="font-size:0.65rem;font-weight:600;letter-spacing:2.5px;
                  color:{c['text3']};text-transform:uppercase;margin-top:2px;">
        EEG · Neural Deviation Modeling
      </div>
    </div>
    """, unsafe_allow_html=True)

    st.sidebar.markdown(f'<div style="height:1px;background:{c["border"]};margin:0 0 1rem 0;"></div>',
                        unsafe_allow_html=True)

    labels = [f"{icon}  {name}" for name, icon in NAV_ITEMS]
    display_names = [name for name, _ in NAV_ITEMS]

    selection = st.sidebar.radio(
        "Navigate",
        labels,
        label_visibility="collapsed",
    )

    idx = labels.index(selection)
    selected_page = display_names[idx]

    st.sidebar.markdown(f'<div style="height:1px;background:{c["border"]};margin:1rem 0;"></div>',
                        unsafe_allow_html=True)

    st.sidebar.markdown(f"""
    <div style="padding:0 0.5rem;color:{c['text3']};font-size:0.75rem;line-height:1.6;">
      Personalized neural baseline modeling using Mahalanobis distance.
      <br/><br/>
      <span style="color:{c['text3']};opacity:0.6;">v0.1 · research prototype</span>
    </div>
    """, unsafe_allow_html=True)

    return selected_page
