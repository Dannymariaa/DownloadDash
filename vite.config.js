import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

const createApiProxy = (prefix, backendBaseUrl, apiKeyHeaders) => ({
  target: backendBaseUrl,
  changeOrigin: true,
  secure: true,
  rewrite: (requestPath) => {
    const stripped = requestPath.replace(new RegExp(`^${prefix}`), '') || '/'
    return stripped.replace(/^\/x(?=\/|$)/, '/twitter')
  },
  headers: apiKeyHeaders,
  configure: (proxy) => {
    proxy.on('proxyReq', (_proxyReq, req) => {
      console.log(`[Vite API Proxy] ${req.method} ${req.url} -> ${backendBaseUrl}`)
    })
    proxy.on('proxyRes', (proxyRes, req) => {
      console.log(`[Vite API Proxy] ${req.method} ${req.url} <- ${proxyRes.statusCode}`)
    })
    proxy.on('error', (err, req) => {
      console.log(`[Vite API Proxy Error] ${req?.method || 'REQUEST'} ${req?.url || ''}:`, err.message)
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendBaseUrl = (env.SMD_API_BASE_URL || 'https://api.downloaddash.store').replace(/\/+$/, '')
  const apiKey = String(env.DOWNLOADDASH_API_KEY || '').trim()
  const apiKeyHeaders = apiKey
    ? {
        'X-DownloadDash-Key': apiKey,
        'X-API-Key': apiKey,
        DOWNLOADDASH_API_KEY: apiKey,
        Authorization: `Bearer ${apiKey}`,
      }
    : {}

  return {
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
      '/api/smd': createApiProxy('/api/smd', backendBaseUrl, apiKeyHeaders),
      '/api': createApiProxy('/api', backendBaseUrl, apiKeyHeaders),
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
  }
});
