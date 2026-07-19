import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base './' keeps the bundle path-agnostic: the same build works at the site
// root locally and under /illo3d/specs/ (or any other subpath) on Pages.
export default defineConfig({
  base: './',
  plugins: [react()],
  // 'web' is the compose network alias Playwright reaches the served build on.
  server: { host: true, allowedHosts: ['web'] },
  preview: { host: true, allowedHosts: ['web'] },
})
