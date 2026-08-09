// ========== 路由守卫：未登录跳 /login ==========
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/authStore';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const isAuthed = useAuth((s) => s.isAuthed);
  const loading = useAuth((s) => s.loading);
  const loc = useLocation();

  if (loading) {
    return (
      <div className="center" style={{ minHeight: 320 }}>
        <span className="spinner" />
      </div>
    );
  }
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }
  return <>{children}</>;
}
