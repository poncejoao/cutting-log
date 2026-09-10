import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192-v2.png", "icon-512-v2.png"],
      manifest: {
        name: "Cutting Log",
        short_name: "Cutting Log",
        description: "Treino PPL, dieta e peso corporal — João Gabriel",
        theme_color: "#1E1A16",
        background_color: "#1E1A16",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192-v2.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512-v2.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],
});
