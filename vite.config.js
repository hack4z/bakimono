import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [solid(), tailwindcss(), 
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: "auto",
      includeAssets: ['apple-touch-icon-180x180.png'],
      manifest: false,
    }),
    ],
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});