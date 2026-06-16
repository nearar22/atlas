import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: 'var(--parchment)',
        vellum: 'var(--vellum)',
        ink: 'var(--ink)',
        sepia: 'var(--sepia)',
        teal: 'var(--teal)',
        rust: 'var(--rust)',
        gild: 'var(--gild)',
        faded: 'var(--faded)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
