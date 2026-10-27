import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          // Recoloured to the public-site teal via CSS vars in globals.css.
          // White-label installs still override --brand-rgb inline, so per-clinic
          // branding keeps working untouched.
          DEFAULT: 'rgb(var(--brand-rgb) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark-rgb) / <alpha-value>)',
          // Optional extra shades for the item-2 UI polish (safe defaults if a
          // white-label install doesn't set them).
          light: 'rgb(var(--brand-light-rgb, 45 212 191) / <alpha-value>)',
        },
        accent: 'rgb(var(--accent-rgb, 56 189 248) / <alpha-value>)',
      },
      keyframes: {
        // v7.5.2 (item 5): red "you have a reply" pulse for the client inbox banner.
        'rp-flash': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.55)' },
          '50%': { boxShadow: '0 0 0 8px rgba(239, 68, 68, 0)' },
        },
      },
      animation: {
        'rp-flash': 'rp-flash 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
