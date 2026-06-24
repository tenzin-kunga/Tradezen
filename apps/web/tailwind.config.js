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
        sans: ['var(--font-display)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-display)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: ['var(--text-xs)', { lineHeight: 'var(--text-xs--line-height)', letterSpacing: 'var(--text-xs--letter-spacing)', fontWeight: 'var(--text-xs--font-weight)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--text-sm--line-height)', letterSpacing: 'var(--text-sm--letter-spacing)', fontWeight: 'var(--text-sm--font-weight)' }],
        base: ['var(--text-base)', { lineHeight: 'var(--text-base--line-height)', letterSpacing: 'var(--text-base--letter-spacing)', fontWeight: 'var(--text-base--font-weight)' }],
        lg: ['var(--text-lg)', { lineHeight: 'var(--text-lg--line-height)', letterSpacing: 'var(--text-lg--letter-spacing)', fontWeight: 'var(--text-lg--font-weight)' }],
        xl: ['var(--text-xl)', { lineHeight: 'var(--text-xl--line-height)', letterSpacing: 'var(--text-xl--letter-spacing)', fontWeight: 'var(--text-xl--font-weight)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--text-2xl--line-height)', letterSpacing: 'var(--text-2xl--letter-spacing)', fontWeight: 'var(--text-2xl--font-weight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--text-3xl--line-height)', letterSpacing: 'var(--text-3xl--letter-spacing)', fontWeight: 'var(--text-3xl--font-weight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--text-4xl--line-height)', letterSpacing: 'var(--text-4xl--letter-spacing)', fontWeight: 'var(--text-4xl--font-weight)' }],
        '5xl': ['var(--text-5xl)', { lineHeight: 'var(--text-5xl--line-height)', letterSpacing: 'var(--text-5xl--letter-spacing)', fontWeight: 'var(--text-5xl--font-weight)' }],
        '6xl': ['var(--text-6xl)', { lineHeight: 'var(--text-6xl--line-height)', letterSpacing: 'var(--text-6xl--letter-spacing)', fontWeight: 'var(--text-6xl--font-weight)' }],
      },
      spacing: {
        0: 'var(--space-0)',
        '0.5': 'var(--space-0\\.5)',
        1: 'var(--space-1)',
        '1.5': 'var(--space-1\\.5)',
        2: 'var(--space-2)',
        '2.5': 'var(--space-2\\.5)',
        3: 'var(--space-3)',
        '3.5': 'var(--space-3\\.5)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        7: 'var(--space-7)',
        8: 'var(--space-8)',
        9: 'var(--space-9)',
        10: 'var(--space-10)',
        11: 'var(--space-11)',
        12: 'var(--space-12)',
        14: 'var(--space-14)',
        16: 'var(--space-16)',
        20: 'var(--space-20)',
        24: 'var(--space-24)',
        28: 'var(--space-28)',
        32: 'var(--space-32)',
      },
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          surface: 'var(--bg-surface)',
          'surface-hover': 'var(--bg-surface-hover)',
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
        },
        loss: {
          DEFAULT: 'var(--accent-loss)',
        },
        warn: {
          DEFAULT: 'var(--accent-warn)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          primary: 'var(--accent-primary)',
          cyan: 'var(--accent-cyan)',
        },
        glass: 'var(--bg-glass)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        input: 'var(--input)',
        ring: 'var(--ring)',
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: {
            DEFAULT: 'var(--sidebar-primary)',
            foreground: 'var(--sidebar-primary-foreground)',
          },
          accent: {
            DEFAULT: 'var(--sidebar-accent)',
            foreground: 'var(--sidebar-accent-foreground)',
          },
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'glow-profit': 'var(--shadow-glow-profit)',
        'glow-loss': 'var(--shadow-glow-loss)',
        'glow-accent': 'var(--shadow-glow-accent)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        in: 'var(--ease-in)',
        spring: 'var(--ease-spring)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'fade-in': 'fadeIn 0.25s ease-out',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up': 'slideUp 0.25s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
