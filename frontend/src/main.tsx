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
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
