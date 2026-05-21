"""
app.py
Entry point for the Baseline Streamlit application.
"""

import streamlit as st
from config import APP_TITLE, APP_ICON
from database.db import init_db

st.set_page_config(
    page_title="Baseline",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

init_db()

from frontend.theme import inject_css
inject_css()

from frontend.pages import (
    dashboard,
    upload,
    baseline_builder,
    deviation_analysis,
    comparison,
    explainability,
    methodology,
)
from frontend.components.sidebar import render_sidebar

PAGES = {
    "Dashboard":                 dashboard,
    "Upload Data":               upload,
    "Baseline Profile":          baseline_builder,
    "Neural Deviation Analysis": deviation_analysis,
    "Population vs Personal":    comparison,
    "Insights & Explainability": explainability,
    "Methodology":               methodology,
}


def main() -> None:
    page_name = render_sidebar()
    PAGES[page_name].render()


if __name__ == "__main__":
    main()
