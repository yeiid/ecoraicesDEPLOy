// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import AstroPWA from "@vite-pwa/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [
    AstroPWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      manifest: {
        name: 'EcoRaíces',
        short_name: 'EcoRaíces',
        description: 'Catálogo de especies y registro de avistamientos para La Guajira.',
        theme_color: '#1a472a',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/offline',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
      },
      devOptions: {
        enabled: true,
        navigateFallbackAllowlist: [/^\//]
      }
    })
  ],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
});