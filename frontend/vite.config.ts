import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    define: {
      // 注入API地址环境变量
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || ''),
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false, // 生产环境不需要sourcemap
      target: 'es2020', // 确保兼容性，支持 ?? 和 ?. 语法
    },
  }
})

