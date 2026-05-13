/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '../../docs/MRSys_v13.jsx',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1E3A8A',
          50: '#EFF4FF',
          100: '#DBE8FF',
          700: '#1D40AE',
          800: '#1E3A8A',
          900: '#1E3370',
        },
      },
    },
  },
  safelist: [
    // Badges de categoria das propostas — garante geração mesmo em ternários longos
    'bg-sky-500/20', 'text-sky-300', 'border-sky-500/30',
    'bg-amber-500/20', 'text-amber-300', 'border-amber-500/30',
  ],
  plugins: [],
}
