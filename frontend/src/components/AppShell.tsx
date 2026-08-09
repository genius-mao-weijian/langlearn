// ========== 应用外壳：顶部导航 + 内容槽 ==========
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authStore';
import { useEffect } from 'react';

const navItems: Array<{ to: string; label: string }> = [
  { to: '/', label: '首页' },
  { to: '/courses', label: '课程' },
  { to: '/learn', label: '学习' },
];

function initial(name: string | undefined | null): string {
  if (!name) return '?';
  const ch = name.trim().charAt(0).toUpperCase();
  return ch || '?';
}

export default function AppShell() {
  const user = useAuth((s) => s.user);
  const isAuthed = useAuth((s) => s.isAuthed);
  const init = useAuth((s) => s.init);
  const logout = useAuth((s) => s.logout);
  const loading = useAuth((s) => s.loading);
  const navigate = useNavigate();

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink to="/" className="app-brand" style={{ textDecoration: 'none' }}>
            <span className="app-brand__logo" aria-hidden>
              语
            </span>
            <span>LangLearn 多语种</span>
          </NavLink>
          <nav className="app-nav">
            {navItems.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.to === '/'}
                className={({ isActive }) =>
                  `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                }
              >
                {i.label}
              </NavLink>
            ))}
            {isAuthed && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `app-nav__link${isActive ? ' app-nav__link--active' : ''}`
                }
              >
                进度
              </NavLink>
            )}
          </nav>
          <div className="app-header__user">
            {loading ? (
              <span className="muted" style={{ fontSize: 13 }}>加载中…</span>
            ) : isAuthed && user ? (
              <>
                <div className="app-header__avatar" title={user.email}>
                  {initial(user.nickname || user.email)}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {user.nickname || user.email.split('@')[0]}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>
                    {user.nativeLanguage ? `${user.nativeLanguage.toUpperCase()}→` : ''}
                    {user.targetLanguage?.toUpperCase() ?? '—'}
                  </span>
                </div>
                <button className="btn btn--sm btn--ghost" onClick={onLogout}>
                  退出
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn--sm btn--ghost">登录</NavLink>
                <NavLink to="/register" className="btn btn--sm btn--primary">免费注册</NavLink>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        © {new Date().getFullYear()} LangLearn · 多语种沉浸式在线学习平台 · P0 预览版
      </footer>
    </div>
  );
}
