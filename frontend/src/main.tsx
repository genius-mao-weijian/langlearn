/**
 * React 应用入口文件
 *
 * 将根组件 App 挂载到 index.html 中的 #root 节点。
 * 使用 BrowserRouter 提供基于 HTML5 History API 的客户端路由能力。
 */
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// 创建 React 根并渲染应用
// StrictMode 会在开发环境下额外执行一次渲染以检测潜在副作用，生产构建自动失效
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
