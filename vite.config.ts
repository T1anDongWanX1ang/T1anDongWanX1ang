import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 使用相对路径，便于部署
  build: {
    outDir: 'dist',
    sourcemap: false, // 生产环境不生成 sourcemap
    minify: 'terser', // 使用 terser 压缩
    rollupOptions: {
      output: {
        // 分包策略
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    },
    // 构建优化
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})



