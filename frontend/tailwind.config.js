/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          soft: 'var(--color-primary-soft)',
        },
        ink: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-secondary)',
        },
        pitch: 'var(--color-dark)',
        field: 'var(--color-green)',
        gold: 'var(--color-gold)',
        canvas: 'var(--color-bg)',
        line: 'var(--color-border)',
      },
      fontFamily: {
        display: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        site: '1280px',
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        soft: '0 1px 2px rgb(23 23 25 / 0.06), 0 4px 16px rgb(23 23 25 / 0.06)',
        lift: '0 2px 4px rgb(23 23 25 / 0.08), 0 8px 24px rgb(23 23 25 / 0.10)',
      },
    },
  },
  plugins: [],
};
