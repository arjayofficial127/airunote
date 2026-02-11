import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      // 8px spacing grid system
      spacing: {
        'grid-1': '0.5rem',   // 8px
        'grid-2': '1rem',     // 16px
        'grid-3': '1.5rem',   // 24px
        'grid-4': '2rem',     // 32px
        'grid-5': '2.5rem',   // 40px
        'grid-6': '3rem',     // 48px
        'grid-8': '4rem',     // 64px
        'grid-10': '5rem',    // 80px
        'grid-12': '6rem',    // 96px
      },
      // Elevation layers (Material Design inspired)
      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'elevation-2': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'elevation-3': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'elevation-4': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        'elevation-5': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        // Micro shadows for hover
        'micro': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'micro-hover': '0 2px 4px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        // Glow line for active block
        'glow-line': '0 0 0 1px rgba(59, 130, 246, 0.5), 0 0 8px 2px rgba(59, 130, 246, 0.2)',
      },
      // Smooth transitions
      transitionDuration: {
        'micro': '150ms',
        'smooth': '250ms',
        'gentle': '350ms',
        'select': '80ms', // Selection animation
      },
      transitionTimingFunction: {
        'ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-gentle': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'ease-select': 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy selection
      },
    },
  },
  plugins: [],
};

export default config;

