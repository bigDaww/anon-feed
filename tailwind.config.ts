import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ol: {
          canvas: "var(--ol-canvas)",
          surface: "var(--ol-surface)",
          ink: "var(--ol-ink)",
          muted: "var(--ol-muted)",
          faint: "var(--ol-faint)",
          border: "var(--ol-border)",
          primary: "var(--ol-primary)",
          "primary-hover": "var(--ol-primary-hover)",
          coral: "var(--ol-coral)",
          "coral-hover": "var(--ol-coral-hover)",
          danger: "var(--ol-danger)",
          // Back-compat aliases → near-black (not coral)
          accent: "var(--ol-primary)",
          "accent-hover": "var(--ol-primary-hover)",
          "accent-soft": "#f0f0f0",
        },
      },
      spacing: {
        nav: "var(--ol-nav-height)",
        "bottom-nav": "var(--ol-bottom-nav-height)",
        "sidebar-left": "280px",
        "sidebar-right": "320px",
      },
      maxWidth: {
        shell: "1128px",
        feed: "552px",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        voice: ["var(--font-voice)", "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
