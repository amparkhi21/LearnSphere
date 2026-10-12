/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#e0eaff",
          200: "#c2d5ff",
          300: "#94b3ff",
          400: "#6086ff",
          500: "#3d5eff",
          600: "#2540f0",
          700: "#1e30cc",
          800: "#1e2ba3",
          900: "#1e2a80",
        },
        accent: {
          400: "#22d3ee",
          500: "#06b6d4",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 8px rgba(15, 23, 42, 0.06)",
        card: "0 4px 20px rgba(15, 23, 42, 0.08)",
        elevated: "0 12px 40px rgba(30, 48, 204, 0.12)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #3d5eff 0%, #06b6d4 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, #f0f5ff 0%, #e0f7fa 100%)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
