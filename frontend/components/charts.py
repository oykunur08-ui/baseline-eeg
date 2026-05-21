"""
frontend/components/charts.py
Chart theme wrapper and custom chart components.
"""

import plotly.graph_objects as go
from frontend.theme import COLORS


def apply_chart_theme(fig: go.Figure) -> go.Figure:
    c = COLORS
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(
            family="Inter, -apple-system, BlinkMacSystemFont, sans-serif",
            size=12,
            color=c["text2"],
        ),
        title_font=dict(color=c["text"], size=14, family="Inter, sans-serif"),
        xaxis=dict(
            gridcolor="rgba(255,255,255,0.06)",
            zerolinecolor="rgba(255,255,255,0.1)",
            tickfont=dict(color=c["text3"], size=11),
            title_font=dict(color=c["text3"], size=12),
        ),
        yaxis=dict(
            gridcolor="rgba(255,255,255,0.06)",
            zerolinecolor="rgba(255,255,255,0.1)",
            tickfont=dict(color=c["text3"], size=11),
            title_font=dict(color=c["text3"], size=12),
        ),
        legend=dict(
            bgcolor="rgba(0,0,0,0)",
            bordercolor="rgba(255,255,255,0.08)",
            borderwidth=1,
            font=dict(color=c["text2"], size=11),
        ),
        margin=dict(l=40, r=40, t=50, b=40),
        hoverlabel=dict(
            bgcolor=c["bg2"],
            bordercolor=c["border"],
            font=dict(color=c["text"], size=12, family="Inter, sans-serif"),
        ),
    )
    return fig


def deviation_gauge_chart(distance: float, max_val: float = 8.0) -> go.Figure:
    c = COLORS
    clamped = min(distance, max_val)

    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=clamped,
        number=dict(
            font=dict(color=c["text"], size=36, family="Inter, sans-serif"),
            suffix="",
            valueformat=".2f",
        ),
        gauge=dict(
            axis=dict(
                range=[0, max_val],
                tickwidth=1,
                tickcolor=c["text3"],
                tickfont=dict(color=c["text3"], size=10),
                nticks=5,
            ),
            bar=dict(color=c["accent"], thickness=0.25),
            bgcolor="rgba(0,0,0,0)",
            borderwidth=0,
            steps=[
                dict(range=[0,   1.5], color="rgba(16,185,129,0.15)"),
                dict(range=[1.5, 3.0], color="rgba(245,158,11,0.15)"),
                dict(range=[3.0, 5.0], color="rgba(249,115,22,0.15)"),
                dict(range=[5.0, max_val], color="rgba(239,68,68,0.15)"),
            ],
            threshold=dict(
                line=dict(color=c["accent"], width=2),
                thickness=0.75,
                value=clamped,
            ),
        ),
        title=dict(
            text="Mahalanobis Distance",
            font=dict(color=c["text3"], size=12, family="Inter, sans-serif"),
        ),
    ))

    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, sans-serif", color=c["text2"]),
        margin=dict(l=20, r=20, t=60, b=20),
        height=240,
    )
    return fig
