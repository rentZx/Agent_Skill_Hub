import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))"
      },
      boxShadow: {
        "glass": "0 18px 50px rgba(0, 0, 0, 0.32)",
        "focus-glow": "0 0 0 1px rgba(109, 232, 219, 0.32), 0 0 42px rgba(109, 232, 219, 0.12)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"]
      },
      keyframes: {
        "grid-drift": {
          "0%": { backgroundPosition: "0px 0px" },
          "100%": { backgroundPosition: "48px 48px" }
        },
        "signal": {
          "0%, 100%": { opacity: "0.22" },
          "50%": { opacity: "0.54" }
        }
      },
      animation: {
        "grid-drift": "grid-drift 16s linear infinite",
        "signal": "signal 3.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
