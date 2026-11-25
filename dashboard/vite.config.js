import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * VITE_API_URL — public URL of the TraceNest API (e.g. https://api.example.up.railway.app).
 *
 * Production build (Vercel / Dockerfile.prod): set VITE_API_URL; it is inlined
 * into the bundle at build time and the dashboard calls the API directly.
 *
 * Local dev: leave VITE_API_URL empty to call relative /api/* URLs, which the
 * dev server proxies to VITE_PROXY_TARGET (default http://localhost:3000) —
 * no CORS involved. Set VITE_API_URL to bypass the proxy.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000'

  if (mode === 'production' && !env.VITE_API_URL) {
    console.warn('\n⚠  VITE_API_URL is not set — the production dashboard will call /api on its own origin.\n')
  }

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api':    { target: proxyTarget, changeOrigin: true },
        '/health': { target: proxyTarget, changeOrigin: true },
      },
    },
    preview: {
      port: 4173,
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },
  }
})
