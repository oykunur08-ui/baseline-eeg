"""
frontend/components/metrics.py
Metric display components: stability gauge, NL summary, feature rank table.
"""

import math
import streamlit as st
from frontend.theme import COLORS


def stability_gauge(score: float) -> None:
    c = COLORS
    score = max(0.0, min(1.0, score))
    pct = int(score * 100)

    if score >= 0.7:
        arc_color = c["green"]
    elif score >= 0.4:
        arc_color = c["amber"]
    else:
        arc_color = c["red"]

    # SVG arc gauge: full arc = 220 degrees, centered
    radius = 54
    cx, cy = 70, 72
    stroke_width = 8
    total_angle = 220
    start_angle = 160

    def polar(cx, cy, r, angle_deg):
        rad = math.radians(angle_deg)
        return cx + r * math.cos(rad), cy - r * math.sin(rad)

    def arc_path(cx, cy, r, start_deg, end_deg):
        sx, sy = polar(cx, cy, r, start_deg)
        ex, ey = polar(cx, cy, r, end_deg)
        large = 1 if abs(end_deg - start_deg) > 180 else 0
        sweep = 0
        return f"M {sx:.1f} {sy:.1f} A {r} {r} 0 {large} {sweep} {ex:.1f} {ey:.1f}"

    # Background arc (full 220°)
    end_bg = start_angle - total_angle
    bg_path = arc_path(cx, cy, radius, start_angle, end_bg)

    # Foreground arc (proportional)
    fill_angle = total_angle * score
    end_fg = start_angle - fill_angle
    fg_path = arc_path(cx, cy, radius, start_angle, end_fg) if score > 0.01 else ""

    fg_svg = f'<path d="{fg_path}" fill="none" stroke="{arc_color}" stroke-width="{stroke_width}" stroke-linecap="round"/>' if fg_path else ""

    st.markdown(f"""
    <div style="display:flex;flex-direction:column;align-items:center;
                background:{c['bg_card']};border:1px solid {c['border']};
                border-radius:16px;padding:1.25rem;gap:0.25rem;">
      <svg width="140" height="100" viewBox="0 0 140 100">
        <path d="{bg_path}" fill="none" stroke="rgba(255,255,255,0.08)"
              stroke-width="{stroke_width}" stroke-linecap="round"/>
        {fg_svg}
        <text x="{cx}" y="{cy+4}" text-anchor="middle" dominant-baseline="middle"
              fill="{arc_color}" font-family="Inter,sans-serif"
              font-size="22" font-weight="700">{pct}%</text>
      </svg>
      <div style="color:{c['text3']};font-size:0.72rem;font-weight:600;
                  letter-spacing:1px;text-transform:uppercase;margin-top:-0.5rem;">
        Stability Index
      </div>
    </div>
    """, unsafe_allow_html=True)


def natural_language_summary(z_scores: dict, threshold: float = 1.0) -> None:
    c = COLORS
    deviating = {k: v for k, v in z_scores.items() if abs(v) >= threshold}
    deviating_sorted = sorted(deviating.items(), key=lambda t: abs(t[1]), reverse=True)

    if not deviating_sorted:
        body = f'<div style="color:{c["green"]};font-size:0.875rem;">All features within normal range ✓</div>'
    else:
        lines = []
        for feat, z in deviating_sorted:
            direction = "above" if z > 0 else "below"
            arrow = "↑" if z > 0 else "↓"
            intensity = "slightly" if abs(z) < 1.5 else ("notably" if abs(z) < 2.5 else "strongly")
            color = c["orange"] if z > 0 else c["blue"]
            feat_display = feat.replace("_", " ").title()
            lines.append(
                f'<div style="padding:0.35rem 0;border-bottom:1px solid {c["border"]};'
                f'display:flex;justify-content:space-between;align-items:center;">'
                f'<span style="color:{c["text2"]};font-size:0.85rem;">'
                f'<span style="color:{color};font-weight:600;">{arrow} {feat_display}</span> '
                f'is {intensity} {direction} baseline</span>'
                f'<span style="color:{c["text3"]};font-size:0.78rem;font-family:monospace;">'
                f'z = {z:+.2f}</span></div>'
            )
        body = "".join(lines)

    st.markdown(f"""
    <div style="background:{c['bg_card']};border:1px solid {c['border']};
                border-radius:14px;padding:1.25rem 1.5rem;margin:1rem 0;">
      <div style="color:{c['text']};font-size:0.85rem;font-weight:600;
                  letter-spacing:0.5px;margin-bottom:0.75rem;">What changed?</div>
      {body}
    </div>
    """, unsafe_allow_html=True)


def feature_rank_table(
    feature_contributions: list,
    z_scores: dict,
) -> None:
    c = COLORS
    rows_html = ""
    for i, (feat, abs_z) in enumerate(feature_contributions):
        z = z_scores.get(feat, 0.0)
        direction = "↑" if z > 0 else "↓"
        dir_color = c["orange"] if z > 0 else c["blue"]
        bar_w = min(int(abs_z / 3 * 100), 100)
        bar_color = c["orange"] if z > 0 else c["blue"]
        feat_display = feat.replace("_", " ").title()
        bg = c["bg_card2"] if i % 2 == 0 else "transparent"
        rows_html += f"""
        <tr style="background:{bg};">
          <td style="padding:0.5rem 0.75rem;color:{c['text2']};font-size:0.82rem;white-space:nowrap;">
            #{i+1} {feat_display}</td>
          <td style="padding:0.5rem 0.75rem;text-align:center;">
            <span style="color:{dir_color};font-weight:700;">{direction}</span></td>
          <td style="padding:0.5rem 0.75rem;">
            <div style="background:rgba(255,255,255,0.06);border-radius:4px;height:6px;width:100%;overflow:hidden;">
              <div style="background:{bar_color};height:6px;border-radius:4px;width:{bar_w}%;"></div>
            </div>
          </td>
          <td style="padding:0.5rem 0.75rem;text-align:right;
                     color:{c['text3']};font-size:0.8rem;font-family:monospace;">
            z = {z:+.3f}</td>
        </tr>
        """

    st.markdown(f"""
    <div style="background:{c['bg_card']};border:1px solid {c['border']};
                border-radius:14px;overflow:hidden;margin:0.75rem 0;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid {c['border']};">
            <th style="padding:0.6rem 0.75rem;text-align:left;color:{c['text3']};
                       font-size:0.7rem;font-weight:600;letter-spacing:0.8px;
                       text-transform:uppercase;">Feature</th>
            <th style="padding:0.6rem 0.75rem;color:{c['text3']};font-size:0.7rem;
                       font-weight:600;letter-spacing:0.8px;text-transform:uppercase;">Dir</th>
            <th style="padding:0.6rem 0.75rem;color:{c['text3']};font-size:0.7rem;
                       font-weight:600;letter-spacing:0.8px;text-transform:uppercase;">Magnitude</th>
            <th style="padding:0.6rem 0.75rem;text-align:right;color:{c['text3']};
                       font-size:0.7rem;font-weight:600;letter-spacing:0.8px;
                       text-transform:uppercase;">z-score</th>
          </tr>
        </thead>
        <tbody>{rows_html}</tbody>
      </table>
    </div>
    """, unsafe_allow_html=True)
