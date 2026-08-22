import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    // Prevent duplicate React/ReactDOM runtimes in Vite's optimizer, which
    // can otherwise surface as Invalid Hook Call errors during local dev.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    manifest: true,
    emptyOutDir: true,
  },
})
