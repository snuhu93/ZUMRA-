import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// ZUMRA build configuration
// - React + TypeScript
// - PWA (installable, offline shell caching)
// - Code splitting via manual chunks to keep initial bundle small
export default defineConfig({
  resolve: {
    // Must mirror tsconfig.json's "paths": { "@/*": ["src/*"] }.
    // tsconfig's `paths` only affects the TypeScript type-checker -- Vite's
    // own bundler (Rollup/esbuild) has a separate resolver and needs this
    // alias too, or every `@/...` import fails at build time with
    // "Rollup failed to resolve import ..." on Netlify's clean build.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt'],
      manifest: {
        name: 'ZUMRA',
        short_name: 'ZUMRA',
        description: 'Connect. Share. Belong.',
        theme_color: '#0F9D58',
        background_color: '#0B0F0D',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Never cache API/auth calls -- only cache the static app shell.
        runtimeCaching: [
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

