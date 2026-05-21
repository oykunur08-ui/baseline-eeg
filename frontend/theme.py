"""
frontend/theme.py
Design system — colors, CSS injection, layout helpers.
"""

import streamlit as st

COLORS = {
    "bg":       "#0B0F17",
    "bg2":      "#0D1220",
    "bg_card":  "rgba(255,255,255,0.04)",
    "bg_card2": "rgba(255,255,255,0.07)",
    "border":   "rgba(255,255,255,0.08)",
    "border2":  "rgba(255,255,255,0.14)",
    "accent":   "#00D4FF",
    "accent2":  "#7C3AED",
    "blue":     "#3B82F6",
    "green":    "#10B981",
    "amber":    "#F59E0B",
    "orange":   "#F97316",
    "red":      "#EF4444",
    "text":     "#F1F5F9",
    "text2":    "#94A3B8",
    "text3":    "#64748B",
}

DEVIATION_COLORS = {
    "stable":   COLORS["green"],
    "mild":     COLORS["amber"],
    "moderate": COLORS["orange"],
    "high":     COLORS["red"],
}


def inject_css() -> None:
    c = COLORS
    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    html, body, [class*="css"] {{
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }}

    /* ── App background ── */
    .stApp {{
        background: {c['bg']};
    }}

    /* ── Main container ── */
    .main .block-container {{
        padding: 2rem 2.5rem 4rem 2.5rem;
        max-width: 1400px;
    }}

    /* ── Sidebar ── */
    [data-testid="stSidebar"] {{
        background: {c['bg2']};
        border-right: 1px solid {c['border']};
    }}
    [data-testid="stSidebar"] > div:first-child {{
        padding-top: 1.5rem;
    }}

    /* ── Sidebar nav items ── */
    [data-testid="stSidebar"] .stRadio > div {{
        gap: 0px;
        flex-direction: column;
    }}
    [data-testid="stSidebar"] .stRadio > div > label {{
        background: transparent;
        border-radius: 10px;
        padding: 0.55rem 0.75rem;
        margin: 1px 0;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;
        color: {c['text2']};
        font-size: 0.875rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        width: 100%;
    }}
    [data-testid="stSidebar"] .stRadio > div > label:hover {{
        background: rgba(255,255,255,0.05);
        color: {c['text']};
        border-color: {c['border']};
    }}
    [data-testid="stSidebar"] .stRadio > div > label[data-baseweb="radio"] p {{
        color: inherit;
    }}
    /* Hide the radio dot */
    [data-testid="stSidebar"] .stRadio [data-baseweb="radio"] div:first-child {{
        display: none;
    }}

    /* ── Hide Streamlit chrome ── */
    #MainMenu {{ visibility: hidden; }}
    footer {{ visibility: hidden; }}
    [data-testid="stHeader"] {{ background: transparent; }}
    .viewerBadge_container__r5tak {{ display: none !important; }}
    [data-testid="stToolbar"] {{ display: none; }}

    /* ── Typography ── */
    h1, h2, h3, h4, h5 {{
        font-family: 'Inter', sans-serif;
        color: {c['text']};
        letter-spacing: -0.5px;
    }}
    p {{ color: {c['text2']}; line-height: 1.6; }}

    /* ── Metric cards ── */
    [data-testid="stMetric"] {{
        background: {c['bg_card']};
        border: 1px solid {c['border']};
        border-radius: 16px;
        padding: 1.25rem 1.5rem;
        backdrop-filter: blur(10px);
    }}
    [data-testid="stMetricLabel"] > div {{
        color: {c['text3']} !important;
        font-size: 0.72rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.8px;
        text-transform: uppercase;
    }}
    [data-testid="stMetricValue"] > div {{
        color: {c['text']} !important;
        font-size: 1.9rem !important;
        font-weight: 700 !important;
        letter-spacing: -1px;
    }}
    [data-testid="stMetricDelta"] > div {{
        font-size: 0.8rem !important;
    }}

    /* ── Buttons ── */
    .stButton > button {{
        background: {c['bg_card2']};
        border: 1px solid {c['border2']};
        border-radius: 10px;
        color: {c['text']};
        font-family: 'Inter', sans-serif;
        font-weight: 500;
        font-size: 0.875rem;
        padding: 0.5rem 1.25rem;
        transition: all 0.2s ease;
        letter-spacing: 0.1px;
    }}
    .stButton > button:hover {{
        background: rgba(255,255,255,0.1);
        border-color: {c['border2']};
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }}
    .stButton > button[kind="primary"] {{
        background: linear-gradient(135deg, {c['accent']}, {c['blue']});
        border: none;
        color: #000;
        font-weight: 600;
        box-shadow: 0 2px 16px rgba(0,212,255,0.25);
    }}
    .stButton > button[kind="primary"]:hover {{
        box-shadow: 0 4px 24px rgba(0,212,255,0.4);
        transform: translateY(-1px);
    }}

    /* ── File uploader ── */
    [data-testid="stFileUploader"] {{
        background: {c['bg_card']};
        border: 2px dashed {c['border2']};
        border-radius: 16px;
        transition: border-color 0.2s ease;
    }}
    [data-testid="stFileUploader"]:hover {{
        border-color: {c['accent']}66;
    }}
    [data-testid="stFileUploaderDropzoneInstructions"] {{
        color: {c['text3']};
    }}

    /* ── Select box ── */
    [data-testid="stSelectbox"] [data-baseweb="select"] > div {{
        background: {c['bg_card']};
        border: 1px solid {c['border2']};
        border-radius: 10px;
        color: {c['text']};
    }}

    /* ── Text input ── */
    [data-testid="stTextInput"] input {{
        background: {c['bg_card']};
        border: 1px solid {c['border2']};
        border-radius: 10px;
        color: {c['text']};
        font-family: 'Inter', sans-serif;
    }}
    [data-testid="stTextInput"] input::placeholder {{
        color: {c['text3']};
    }}

    /* ── Slider ── */
    [data-testid="stSlider"] [data-testid="stWidgetLabel"] p {{
        color: {c['text2']};
        font-size: 0.85rem;
    }}
    [data-testid="stSlider"] [data-baseweb="slider"] [data-testid="stThumbValue"] {{
        color: {c['accent']};
    }}

    /* ── Expander ── */
    [data-testid="stExpander"] {{
        background: {c['bg_card']};
        border: 1px solid {c['border']} !important;
        border-radius: 12px;
        overflow: hidden;
    }}
    [data-testid="stExpander"] summary {{
        color: {c['text2']};
        font-weight: 500;
        font-size: 0.875rem;
    }}
    [data-testid="stExpander"] summary:hover {{
        color: {c['text']};
    }}

    /* ── Alert boxes ── */
    [data-testid="stAlert"] {{
        border-radius: 12px;
        border: none;
        font-size: 0.875rem;
    }}

    /* ── Caption ── */
    [data-testid="stCaptionContainer"] p {{
        color: {c['text3']} !important;
        font-size: 0.82rem;
    }}

    /* ── Dataframe ── */
    [data-testid="stDataFrame"] {{
        border-radius: 12px;
        overflow: hidden;
    }}
    .stDataFrame iframe {{
        border-radius: 12px;
    }}

    /* ── Divider ── */
    hr {{
        border: none;
        border-top: 1px solid {c['border']};
        margin: 2rem 0;
    }}

    /* ── Code ── */
    [data-testid="stCode"] {{
        background: {c['bg_card']} !important;
        border: 1px solid {c['border']};
        border-radius: 8px;
    }}

    /* ── Tabs ── */
    [data-baseweb="tab-list"] {{
        background: {c['bg_card']};
        border-radius: 12px;
        padding: 4px;
        gap: 4px;
        border: 1px solid {c['border']};
    }}
    [data-baseweb="tab"] {{
        border-radius: 8px;
        color: {c['text2']};
        font-weight: 500;
        font-size: 0.875rem;
        transition: all 0.15s ease;
    }}
    [data-baseweb="tab"][aria-selected="true"] {{
        background: {c['accent']}22 !important;
        color: {c['accent']} !important;
    }}

    /* ── Checkbox ── */
    [data-testid="stCheckbox"] label p {{
        color: {c['text2']};
        font-size: 0.875rem;
    }}

    /* ── Scrollbar ── */
    ::-webkit-scrollbar {{ width: 6px; height: 6px; }}
    ::-webkit-scrollbar-track {{ background: transparent; }}
    ::-webkit-scrollbar-thumb {{
        background: {c['border2']};
        border-radius: 3px;
    }}
    </style>
    """, unsafe_allow_html=True)


def page_header(title: str, subtitle: str = "") -> None:
    c = COLORS
    sub_html = f'<p style="color:{c["text3"]};font-size:0.9rem;margin:0.25rem 0 0 0;font-weight:400;">{subtitle}</p>' if subtitle else ""
    st.markdown(f"""
    <div style="margin-bottom:2rem;">
      <h1 style="color:{c['text']};font-size:1.9rem;font-weight:700;
                 letter-spacing:-0.8px;margin:0;line-height:1.2;">{title}</h1>
      {sub_html}
    </div>
    """, unsafe_allow_html=True)
