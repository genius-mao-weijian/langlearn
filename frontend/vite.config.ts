/**
 * Vite 配置文件
 *
 * 配置内容：
 * 1. 启用 React 插件（提供 JSX 转换与 Fast Refresh 热更新支持）
 * 2. 配置开发服务器代理：将 /api 前缀的请求转发到后端服务（默认 http://localhost:3000），
 *    使前后端在开发环境下共用同源访问，规避跨域问题。
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // React 插件：提供 JSX 自动运行时转换与组件热更新
  plugins: [react()],
  server: {
    // 开发服务器监听端口（Vite 默认 5173）
    port: 5173,
    // 代理配置：将 /api 前缀的请求转发到后端
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        // 修改请求头中的 Origin，使后端 CORS 校验通过
        changeOrigin: true,
      },
    },
  },
});
