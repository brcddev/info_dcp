import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  base: '/pwa/',
  plugins: [preact()],
  server: {
    proxy: {
      '/api': {
        target: 'https://lan.pbord.ru', // или http://localhost:3000 если шлюз запущен локально
        changeOrigin: true,
        secure: true, // если target https
      }
    }
  }
});