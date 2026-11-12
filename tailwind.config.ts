import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ink-green': 'var(--ink-green)',
        'deep-green': 'var(--deep-green)',
        'mid-green': 'var(--mid-green)',
        'brass': 'var(--brass)',
        'brass-hover': '#9e6e1f',
        'paper': 'var(--paper)',
        'card-white': 'var(--white)',
        'line': 'var(--line)',
        'soft-line': 'var(--soft-line)',
        'ink': 'var(--text)',
        'muted-ink': 'var(--muted)',
        'body-muted': 'var(--body-muted)',
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'hard-green-sm': '2px 2px 0 #0e3b2e',
        'hard-green': '4px 4px 0 #0e3b2e',
        'hard-green-lg': '6px 6px 0 #0e3b2e',
        'hard-brass-sm': '2px 2px 0 #b5822c',
        'hard-brass': '4px 4px 0 #b5822c',
        'hard-brass-lg': '6px 6px 0 #b5822c',
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '2px',
        md: '2px',
        lg: '2px',
        xl: '2px',
        '2xl': '2px',
        '3xl': '2px',
      },
    },
  },
  plugins: [],
};

export default config;
