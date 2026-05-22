import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        host: '192.168.0.31',
        port: 3000,
        open: false,
        proxy: {
            // 将所有前端发起的 /api 请求代理到 3001 后端端口
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
                secure: false,
            }
        }
    }
});
