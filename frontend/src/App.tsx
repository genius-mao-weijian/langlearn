/**
 * 应用根组件
 *
 * P0 阶段展示欢迎页面与基础路由结构。
 * 路由占位：
 *   - /         首页（欢迎页）
 *   - /login    登录页（占位）
 *   - /register 注册页（占位）
 *   - /learn    学习页（占位）
 */
import { Routes, Route, Link } from 'react-router-dom';

/** 首页组件：展示平台标题与 P0 开发中提示 */
function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>多语种学习平台</h1>
      <p>当前处于 P0 阶段，功能开发中，敬请期待。</p>
      <nav style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/login">登录</Link>
        <Link to="/register">注册</Link>
        <Link to="/learn">开始学习</Link>
      </nav>
    </main>
  );
}

/** 登录页占位 */
function Login() {
  return (
    <main style={{ padding: '2rem' }}>
      <h2>登录</h2>
      <p>页面建设中（P0 占位）</p>
    </main>
  );
}

/** 注册页占位 */
function Register() {
  return (
    <main style={{ padding: '2rem' }}>
      <h2>注册</h2>
      <p>页面建设中（P0 占位）</p>
    </main>
  );
}

/** 学习页占位 */
function Learn() {
  return (
    <main style={{ padding: '2rem' }}>
      <h2>学习中心</h2>
      <p>页面建设中（P0 占位）</p>
    </main>
  );
}

/** App 根组件：定义路由表 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/learn" element={<Learn />} />
    </Routes>
  );
}
