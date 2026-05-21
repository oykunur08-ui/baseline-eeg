"""
frontend/components/cards.py
Reusable HTML card components for the Baseline UI.
"""

import streamlit as st
from frontend.theme import COLORS, DEVIATION_COLORS


def stat_card(value, label: str, icon: str = "", color: str = "accent", delta: str = "") -> None:
    c = COLORS
    color_map = {
        "accent": c["accent"],
        "green":  c["green"],
        "amber":  c["amber"],
        "red":    c["red"],
        "blue":   c["blue"],
        "text":   c["text"],
    }
    accent_color = color_map.get(color, c["accent"])
    delta_html = ""
    if delta:
        delta_html = f'<div style="color:{c["text3"]};font-size:0.75rem;margin-top:0.25rem;">{delta}</div>'

    st.markdown(f"""
    <div style="
        background:{c['bg_card']};
        border:1px solid {c['border']};
        border-radius:16px;
        padding:1.25rem 1.5rem;
        backdrop-filter:blur(10px);
        position:relative;
        overflow:hidden;
    ">
      <div style="position:absolute;top:0;right:0;width:60px;height:60px;
                  background:radial-gradient(circle at 100% 0%, {accent_color}18, transparent 70%);
                  border-radius:0 16px 0 0;"></div>
      <div style="display:flex;align-items:center;gap:0.4rem;margin-bottom:0.4rem;">
        <span style="color:{c['text3']};font-size:0.7rem;font-weight:700;
                     letter-spacing:1px;text-transform:uppercase;">{icon} {label}</span>
      </div>
      <div style="color:{c['text']};font-size:2rem;font-weight:700;
                  letter-spacing:-1px;line-height:1;">{value}</div>
      {delta_html}
    </div>
    """, unsafe_allow_html=True)


def section_header(title: str, subtitle: str = "") -> None:
    c = COLORS
    sub = f'<p style="color:{c["text3"]};font-size:0.82rem;margin:0.2rem 0 0 0;">{subtitle}</p>' if subtitle else ""
    st.markdown(f"""
    <div style="margin:2rem 0 1rem 0;">
      <h2 style="color:{c['text']};font-size:1.2rem;font-weight:600;
                 letter-spacing:-0.3px;margin:0;">{title}</h2>
      {sub}
    </div>
    """, unsafe_allow_html=True)


def callout(text: str, kind: str = "info") -> None:
    c = COLORS
    style_map = {
        "info":    (c["accent"], c["accent"] + "18"),
        "success": (c["green"],  c["green"]  + "18"),
        "warning": (c["amber"],  c["amber"]  + "18"),
        "error":   (c["red"],    c["red"]    + "18"),
        "neural":  (c["accent2"],c["accent2"]+ "18"),
    }
    border_color, bg_color = style_map.get(kind, style_map["info"])
    st.markdown(f"""
    <div style="
        background:{bg_color};
        border:1px solid {border_color}44;
        border-left:3px solid {border_color};
        border-radius:10px;
        padding:0.85rem 1.1rem;
        margin:0.75rem 0;
        font-size:0.875rem;
        color:{c['text2']};
        line-height:1.6;
    ">{text}</div>
    """, unsafe_allow_html=True)


def info_card(title: str, body: str, icon: str = "ℹ") -> None:
    c = COLORS
    st.markdown(f"""
    <div style="
        background:{c['bg_card']};
        border:1px solid {c['border']};
        border-radius:14px;
        padding:1.25rem 1.5rem;
        margin:0.75rem 0;
    ">
      <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
        <span style="font-size:1rem;">{icon}</span>
        <span style="color:{c['text']};font-size:0.9rem;font-weight:600;">{title}</span>
      </div>
      <div style="color:{c['text2']};font-size:0.85rem;line-height:1.6;">{body}</div>
    </div>
    """, unsafe_allow_html=True)


def deviation_badge(label: str, distance: float) -> None:
    c = COLORS
    color = DEVIATION_COLORS.get(label, c["text3"])
    label_display = label.upper()
    desc_map = {
        "stable":   "Within normal range",
        "mild":     "Minor deviation detected",
        "moderate": "Notable deviation from baseline",
        "high":     "Significant deviation",
    }
    desc = desc_map.get(label, "")
    st.markdown(f"""
    <div style="
        display:flex;
        align-items:center;
        gap:1.5rem;
        background:{c['bg_card']};
        border:1px solid {color}44;
        border-radius:16px;
        padding:1.5rem 2rem;
        margin:1rem 0;
        box-shadow:0 0 30px {color}18;
    ">
      <div style="
          width:80px;height:80px;
          border-radius:50%;
          background:radial-gradient(circle, {color}30, {color}10);
          border:2px solid {color}88;
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;
      ">
        <span style="color:{color};font-size:1.5rem;font-weight:800;">{distance:.2f}</span>
      </div>
      <div>
        <div style="color:{color};font-size:1.1rem;font-weight:700;
                    letter-spacing:1.5px;text-transform:uppercase;">{label_display}</div>
        <div style="color:{c['text3']};font-size:0.82rem;margin-top:0.2rem;">{desc}</div>
        <div style="color:{c['text3']};font-size:0.78rem;margin-top:0.1rem;">
          Mahalanobis D(x) = {distance:.4f}
        </div>
      </div>
    </div>
    """, unsafe_allow_html=True)
