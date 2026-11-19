import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.onrender\.com\/.*$/i, 
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'precobom-sync-queue',
                options: {
                  maxRetentionTime: 24 * 60 
                }
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.onrender\.com\/.*$/i, 
            handler: 'NetworkOnly',
            method: 'PUT',
            options: {
              backgroundSync: {
                name: 'precobom-sync-queue',
                options: { maxRetentionTime: 24 * 60 }
              }
            }
          }
        ]
      },
      manifest: {
        name: 'PreçoBom Logística',
        short_name: 'PreçoBom',
        description: 'Sistema de controle de entregas do Mercado Preço Bom',
        theme_color: '#2E3192',
        background_color: '#2E3192',
        display: 'standalone', 
        icons: [
          {
            src: 'icon-192x192.png', 
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})