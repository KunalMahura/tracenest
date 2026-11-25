/** @type {import('tailwindcss').Config} */

/*
 * TraceNest palette — three brand colours plus tints/shades derived from them.
 *   cream     #efe6d5  paper / backgrounds
 *   teal      #9dbeb7  data, selection, calm states
 *   vermilion #e73213  actions, errors, the "live" signal
 *   ink       warm near-black used for text and rules (mixed from the cream hue)
 */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#fbf8f2',
          100: '#f7f1e6',
          200: '#efe6d5', // brand
          300: '#e6d9c1',
          400: '#d8c7a6',
          500: '#c2ac83',
          600: '#9a8560',
        },
        teal: {
          50:  '#eef4f2',
          100: '#d9e7e3',
          200: '#bcd4cf',
          300: '#9dbeb7', // brand
          400: '#78a39a',
          500: '#57857c',
          600: '#3f6760',
          700: '#2c4a45',
          800: '#1d322f',
        },
        vermilion: {
          50:  '#fdeee9',
          100: '#fad5c9',
          200: '#f4a891',
          300: '#ee7a5a',
          400: '#ea5633',
          500: '#e73213', // brand
          600: '#c4270c',
          700: '#9b1f0b',
          800: '#6f170a',
        },
        ink: {
          DEFAULT: '#1c1915',
          900: '#1c1915',
          800: '#2a261f',
          700: '#3d372e',
          600: '#5a5246',
          500: '#776e60',
          400: '#9a9081',
          300: '#bdb3a2',
        },
      },
      fontFamily: {
        sans:    ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif:   ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        // Legacy alias still used by app pages for headings
        'display-hero': ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Hard offset "print" shadows instead of soft blurs
        hard:     '3px 3px 0 0 #1c1915',
        'hard-sm':'2px 2px 0 0 #1c1915',
        'hard-lg':'6px 6px 0 0 #1c1915',
        'hard-v': '4px 4px 0 0 #e73213',
        xs:       '0 1px 0 0 rgba(28,25,21,0.06)',
      },
      keyframes: {
        'rise-in': {
          '0%':   { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'row-in': {
          '0%':   { opacity: '0', transform: 'translateY(-6px)', backgroundColor: 'rgba(231,50,19,0.10)' },
          '60%':  { opacity: '1', transform: 'translateY(0)' },
          '100%': { backgroundColor: 'transparent' },
        },
        travel: {
          '0%':   { left: '0%', opacity: '0' },
          '8%':   { opacity: '1' },
          '92%':  { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.25' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.55s cubic-bezier(.2,.7,.2,1) both',
        'row-in':  'row-in 1.2s ease-out both',
        travel:    'travel 3.2s linear infinite',
        blink:     'blink 1.4s ease-in-out infinite',
        marquee:   'marquee 38s linear infinite',
      },
    },
  },
  plugins: [],
}
