import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3005,
    host: true, // Cho phép truy cập từ bên ngoài
    hmr: {
      overlay: false // Tắt overlay lỗi để tăng tốc
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // Tắt logging để tăng tốc
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err.message);
          });
        },
      }
    }
  },
  // Tối ưu hóa build
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['framer-motion', 'lucide-react'],
          utils: ['axios', 'react-hot-toast']
        }
      }
    }
  },
  // Tối ưu hóa dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', 'framer-motion', 'lucide-react']
  }
})

