// ========== 登录页 ==========
import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authStore';
import { ApiError } from '../lib/api';

export default function LoginPage() {
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from ?? '/dashboard';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : '登录失败，请稍后再试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container container--narrow">
      <div className="card auth-card">
        <h1 className="auth-card__title">欢迎回来 👋</h1>
        <p className="auth-card__subtitle">登录继续你的语言学习之旅</p>

        {err && <div className="alert alert--error">{err}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="field__label field__label--required" htmlFor="email">邮箱</label>
            <input
              id="email"
              className="input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label className="field__label field__label--required" htmlFor="pwd">密码</label>
            <input
              id="pwd"
              className="input"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
            />
          </div>
          <div className="form-actions">
            <button className="btn btn--primary btn--block" disabled={busy} type="submit">
              {busy ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> 登录中…</> : '登录'}
            </button>
          </div>
        </form>

        <p style={{ marginTop: 18, fontSize: 14, color: '#475569' }}>
          还没有账号？<Link to="/register">立即注册</Link>
        </p>
      </div>
    </div>
  );
}
