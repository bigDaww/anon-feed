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
          accent: "var(--ol-accent)",
          "accent-hover": "var(--ol-accent-hover)",
          "accent-soft": "var(--ol-accent-soft)",
          danger: "var(--ol-danger)",
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
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
