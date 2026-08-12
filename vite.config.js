import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Listen on all network addresses
    port: 3001, // Local dev port for DownloadDash UI
    proxy: {
      // Catch frontend calls to /api/smd/... and cleanly route them locally
      '/api/smd': {
        target: process.env.SMD_API_BASE_URL || 'https://api.downloaddash.store',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/smd/, ''),
        headers: process.env.DOWNLOADDASH_API_KEY
          ? { 'X-DownloadDash-Key': process.env.DOWNLOADDASH_API_KEY }
          : {},
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Vite Proxy Error]:', err.message);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          router: ['react-router-dom'],
          icons: ['lucide-react'],
          ui: ['@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
});
