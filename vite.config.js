import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        skipWaiting: true,
        clientsClaim: true
      },
      manifest: {
        name: "💆‍♀️✨ Hebrew2French",
        short_name: "💆‍♀️ Hebrew",
        description: "Apprentissage Hébreu → Français",
        display: "standalone",
        theme_color: "#4f6df5",
        background_color: "#ffffff",
        start_url: "/"
        // PAS D'ICÔNES → emoji utilisé
      }
    })
  ]
});
