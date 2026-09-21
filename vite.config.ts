import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// ZUMRA build configuration
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512-1.png'],
      manifest: {
        name: 'ZUMRA',
        short_name: 'ZUMRA',
        description: 'Connect. Share. Belong.',
        theme_color: '#0f7b55',
        background_color: '#0f7b55',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-1.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512-1.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        runtimeCaching: [
          // Bidiyo: bar shi ya tafi kai tsaye ta network, kar service worker ta taba shi
          // (bidiyo yana bukatar "range requests" wanda CacheFirst ba ta goyon baya sosai)
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*\.(mp4|webm|mov|m4v)$/,
            handler: 'NetworkOnly'
          },
          // Sauran media (hotuna, audio, da sauransu): CacheFirst kamar yadda yake
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'zumra-media-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    }
  },
  server: {
    port: 5173
  }
});

