// ========== 注册页 ==========
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/authStore';
import { ApiError } from '../lib/api';

export default function RegisterPage() {
  const register = useAuth((s) => s.register);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await register({
        email: email.trim(),
        password,
        nickname: nickname.trim() || undefined,
      });
      navigate('/dashboard?welcome=1', { replace: true });
    } catch (ex) {
      setErr(ex instanceof ApiError ? ex.message : '注册失败，请稍后再试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container container--narrow">
      <div className="card auth-card">
        <h1 className="auth-card__title">创建新账号 ✨</h1>
        <p className="auth-card__subtitle">注册即送 7 天高级学习体验</p>

        {err && <div className="alert alert--error">{err}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="nickname">昵称（可选）</label>
            <input
              id="nickname"
              className="input"
              maxLength={24}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="希望怎么称呼你？"
            />
          </div>
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
            />
            <span className="field__hint">使用强密码以保护账号安全</span>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary btn--block" disabled={busy} type="submit">
              {busy ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> 创建中…</> : '创建账号'}
            </button>
          </div>
        </form>

        <p style={{ marginTop: 18, fontSize: 14, color: '#475569' }}>
          已经有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </div>
  );
}
