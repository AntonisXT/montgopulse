import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                brand: {
                    cyan: "#00f0ff",
                    purple: "#a855f7",
                    pink: "#ec4899",
                    green: "#22c55e",
                    amber: "#f59e0b",
                    red: "#ef4444",
                },
                glass: {
                    50: "rgba(255,255,255,0.03)",
                    100: "rgba(255,255,255,0.05)",
                    200: "rgba(255,255,255,0.08)",
                    300: "rgba(255,255,255,0.12)",
                    border: "rgba(255,255,255,0.08)",
                },
                surface: {
                    DEFAULT: "#0a0a14",
                    raised: "#0f0f1e",
                    overlay: "#141428",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "Fira Code", "monospace"],
            },
            boxShadow: {
                glow: "0 0 20px rgba(0,240,255,0.15)",
                "glow-lg": "0 0 40px rgba(0,240,255,0.2)",
                "glow-purple": "0 0 20px rgba(168,85,247,0.15)",
                "glow-green": "0 0 20px rgba(34,197,94,0.15)",
            },
            keyframes: {
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 8px rgba(0,240,255,0.2)" },
                    "50%": { boxShadow: "0 0 20px rgba(0,240,255,0.4)" },
                },
                "slide-in-right": {
                    "0%": { transform: "translateX(100%)", opacity: "0" },
                    "100%": { transform: "translateX(0)", opacity: "1" },
                },
                "fade-in-up": {
                    "0%": { transform: "translateY(10px)", opacity: "0" },
                    "100%": { transform: "translateY(0)", opacity: "1" },
                },
                scanning: {
                    "0%": { backgroundPosition: "0% 0%" },
                    "100%": { backgroundPosition: "0% 100%" },
                },
            },
            animation: {
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
                "slide-in-right": "slide-in-right 0.3s ease-out",
                "fade-in-up": "fade-in-up 0.4s ease-out",
                scanning: "scanning 3s linear infinite",
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-mesh":
                    "radial-gradient(at 40% 20%, rgba(0,240,255,0.06) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(168,85,247,0.06) 0px, transparent 50%)",
            },
        },
    },
    plugins: [],
};

export default config;
