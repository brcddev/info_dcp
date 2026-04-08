import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      manifest: {
        name: 'info_dcp',
        short_name: 'infoDCP',
        theme_color: '#ffffff',
        icons: [/* ... */]
      },
      injectRegister: false,      // отключаем автоматическую регистрацию
      workbox: { skipWaiting: true, clientsClaim: true }
    })
  ]
});