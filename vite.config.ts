import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project page at /reality_ranking/, so
  // built asset URLs need that prefix. Dev server stays at root so the
  // existing /api proxy below keeps working unchanged.
  base: command === 'build' ? '/reality_ranking/' : '/',
  plugins: [react()],
  server: {
    watch: {
      ignored: ['**/backend/**', '**/node_modules/**', '**/dist/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      // uploaded contestant photos live in backend/uploads (outside this
      // project's root), so unlike before they need an explicit proxy
      // rather than Vite's dev server picking them up as static files
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
}))
