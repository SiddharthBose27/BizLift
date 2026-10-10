/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        biz: {
          orange: "#ff6b35",
          ink: "#111111",
          cream: "#f8f7f4",
        },
      },
    },
  },
  plugins: [],
};
