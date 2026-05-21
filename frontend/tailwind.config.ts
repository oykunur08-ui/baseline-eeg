import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      colors: {
        parchment: "#F7F4EE",
        linen:     "#EFE9DC",
        stone:     "#DDD4C0",
        ink:       "#0E1117",
        navy:      "#0C1740",
        blue:      "#1B3F7A",
        teal:      "#1E6B5C",
        amber:     "#B8832A",
        mist:      "#6B6860",
        dim:       "#3A3830",
        dark: {
          bg:      "#0E1117",
          surface: "#161B28",
          card:    "#1C2235",
          border:  "#252D40",
          muted:   "#4A5568",
        },
      },
      spacing: {
        "section": "8rem",
        "section-sm": "5rem",
      },
      fontSize: {
        "display": ["clamp(3rem, 10vw, 9rem)", { lineHeight: "0.95", letterSpacing: "-0.04em" }],
        "headline": ["clamp(2rem, 5vw, 5rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        "title": ["clamp(1.25rem, 2.5vw, 2rem)", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
      },
      animation: {
        "fade-up":    "fadeUp 0.8s ease forwards",
        "pulse-slow": "pulse 4s ease-in-out infinite",
        "waveform":   "waveform 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        waveform: {
          "0%, 100%": { transform: "scaleY(0.3)" },
          "50%":      { transform: "scaleY(1)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
