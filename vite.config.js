import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192-v3.png", "icon-512-v3.png"],
      manifest: {
        name: "Cutting Log",
        short_name: "Cutting Log",
        description: "Treino PPL, dieta e peso corporal — João Gabriel",
        theme_color: "#1E1A16",
        background_color: "#1E1A16",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192-v3.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512-v3.png", sizes: "512x512", type: "image/png" },
        ],
        // Atalhos do long-press no ícone (Android/iOS 16.4+) — pulam direto
        // pra aba certa via ?tab=, lido uma vez no boot do App.
        shortcuts: [
          {
            name: "Hoje",
            short_name: "Hoje",
            url: "/?tab=hoje",
            icons: [{ src: "icon-192-v3.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Treino",
            short_name: "Treino",
            url: "/?tab=treino",
            icons: [{ src: "icon-192-v3.png", sizes: "192x192", type: "image/png" }],
          },
          {
            name: "Dieta",
            short_name: "Dieta",
            url: "/?tab=dieta",
            icons: [{ src: "icon-192-v3.png", sizes: "192x192", type: "image/png" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        runtimeCaching: [
          {
            // folha de estilo do Google Fonts — precisa revalidar de vez em quando
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // arquivos de fonte em si — nunca mudam, cache longo
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
