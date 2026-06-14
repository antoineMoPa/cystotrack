import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f7f5ef",
        foreground: "#24312d",
        card: "#ffffff",
        primary: "#266b5f",
        "primary-hover": "#1f5a50",
        "primary-foreground": "#ffffff",
        muted: "#e9eee9",
        "muted-foreground": "#62706b",
        border: "#dce3de",
        destructive: "#b42318",
        success: "#10b981",
        warning: "#f59e0b"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"]
      },
      boxShadow: {
        card: "0 8px 30px rgba(34, 64, 55, 0.08)",
        glow: "0 4px 12px rgba(38, 107, 95, 0.28)",
        focus: "0 0 0 3px rgba(38, 107, 95, 0.16)"
      }
    }
  },
  plugins: []
} satisfies Config;
