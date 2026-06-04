/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          glass: 'var(--bg-glass)',
          card: 'var(--bg-card)',
          panel: 'var(--bg-panel)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
          dim: 'var(--text-dim)',
        },
        profit: {
          DEFAULT: 'var(--accent-profit)',
          glow: 'var(--accent-profit-glow)',
        },
        loss: {
          DEFAULT: 'var(--accent-loss)',
          glow: 'var(--accent-loss-glow)',
        },
        cyan: {
          DEFAULT: 'var(--accent-cyan)',
          glow: 'var(--accent-cyan-glow)',
        },
        warn: {
          DEFAULT: 'var(--accent-warn)',
          glow: 'var(--accent-warn-glow)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
        'glass-hover': '0 12px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        glow: {
          profit: '0 0 20px var(--accent-profit-glow)',
          loss: '0 0 16px var(--accent-loss-glow)',
          cyan: '0 0 16px var(--accent-cyan-glow)',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};