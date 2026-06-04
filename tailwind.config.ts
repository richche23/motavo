import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'ui-sans-serif', 'system-ui'],
        body:    ['Hanken Grotesk', 'ui-sans-serif', 'system-ui'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        tiny:  ['11px', { lineHeight: '1.4' }],
        micro: ['10px', { lineHeight: '1.4' }],
      },
      letterSpacing: { wide: '0.06em' },
    },
  },
  plugins: [],
};
export default config;
