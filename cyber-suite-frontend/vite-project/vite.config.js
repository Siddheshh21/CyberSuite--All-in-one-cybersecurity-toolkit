import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          animations: ['./src/index.css']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'https://cyber-suite-backend.onrender.com',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
