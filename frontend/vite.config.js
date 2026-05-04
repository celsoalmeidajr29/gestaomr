import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    resolve: {
      // garante que imports em arquivos fora de frontend/ (ex: docs/MRSys_v13.jsx)
      // resolvam dependências contra o node_modules deste pacote
      modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})
