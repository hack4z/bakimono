import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [solid(), tailwindcss(), VitePWA({
      registerType: 'autoUpdate',
      injectRegister: "script-defer",
      includeAssets: ['apple-touch-icon-180x180.png'],
      manifest: {
        name: 'BAKIMONO',
        short_name: 'BAKIMONO',
        description: 'BAKIMONO digital product',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        theme_color: '#344e41',
        background_color: '#f8f7f5',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
    ],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
