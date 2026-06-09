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
        "primary-foreground": "#ffffff",
        muted: "#e9eee9",
        "muted-foreground": "#62706b",
        border: "#dce3de",
        destructive: "#b42318"
      },
      boxShadow: {
        card: "0 8px 30px rgba(34, 64, 55, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;

