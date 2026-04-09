import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({


      manifest: {
        name: "Message DCP",
        short_name: "msgDCP",
        description: "Уведомления от ESP32",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"   // для Android
          }
        ],
        // Добавляем скриншоты (обязательно!)
        screenshots: [
          {
            src: "/screenshots/wide.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Главный экран"
          },
          {
            src: "/screenshots/mobile.png",
            sizes: "720x1280",
            type: "image/png",
            label: "Мобильный вид"
          }
        ]




      },
      injectRegister: false,      // отключаем автоматическую регистрацию
      registerType: 'autoUpdate',
      workbox: { 
        swDest: 'sw.js',
        importScripts: [],
        navigateFallback: null
      }
    })
  ]
});