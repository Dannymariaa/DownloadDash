import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'path'

const inlineEntryChunk = () => ({
  name: 'inline-entry-chunk',
  closeBundle() {
    const distDir = path.resolve(__dirname, 'dist');
    const htmlPath = path.join(distDir, 'index.html');

    if (!fs.existsSync(htmlPath)) {
      return;
    }

    let html = fs.readFileSync(htmlPath, 'utf8');
    const entryScriptPattern = /<script type="module" crossorigin src="\/(assets\/index-[^"]+\.js)"><\/script>/;
    const match = html.match(entryScriptPattern);

    if (!match) {
      return;
    }

    const entryFileName = match[1];
    const entryPath = path.join(distDir, entryFileName);

    if (!fs.existsSync(entryPath)) {
      return;
    }

    const entryCode = fs
      .readFileSync(entryPath, 'utf8')
      .replace(/import\("\.\/([^"]+\.js)"\)/g, 'import("./assets/$1")');
    html = html.replace(
      entryScriptPattern,
      `<script type="module">${entryCode}</script>`,
    );
    fs.writeFileSync(htmlPath, html);
    fs.unlinkSync(entryPath);
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    inlineEntryChunk(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Listen on all addresses
    port: 3001, // Local dev port (DownloadDash UI)
    // Proxy API requests to avoid CORS issues in local dev.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
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
