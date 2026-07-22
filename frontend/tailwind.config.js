/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'galactic': ['Major Mono Display', 'monospace'], // モノスペースフォント
      },
      colors: {
        'lime': {
          DEFAULT: '#B0FF00', // 画像1の蛍光グリーン
          dark: '#91CF00', // ボタンのホバー時など
        },
        'galactic': {
          bg: '#000801', // 画像1の暗い背景
          panel: '#0B130F', // 画像1のパネル背景
          panelBorder: '#0F2618', // パネルのボーダー
        }
      },
      animation: {
        'glitch': 'glitch 0.4s cubic-bezier(.25,.46,.45,.94) both infinite', // グリッチ効果
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-3px, 3px)' },
          '40%': { transform: 'translate(-3px, -3px)' },
          '60%': { transform: 'translate(3px, 3px)' },
          '80%': { transform: 'translate(3px, -3px)' },
          '100%': { transform: 'translate(0)' },
        },
      }
    },
  },
  plugins: [],
}