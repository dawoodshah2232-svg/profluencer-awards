import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the built site works from any path (GitHub Pages project
// site, cPanel subfolder, or domain root) with zero server rewrites.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
