// ========== 成就勋章页 ==========
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { achievementApi } from '../lib/api';
import type { Achievement } from '../lib/types';

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

const categoryLabel: Record<string, string> = {
  general: '综合',
  streak: '连击',
  exercise: '练习',
  xp: '经验',
};

export default function AchievementsPage() {
  const [list, setList] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    achievementApi
      .list()
      .then((r) => { if (!cancelled) setList(r); })
      .catch((e) => !cancelled && setErr(e?.message ?? '加载失败'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="container center"><span className="spinner" /></div>;
  if (err) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="empty__icon">🔌</div>
          <h2>加载失败</h2>
          <p className="muted">{err}</p>
        </div>
      </div>
    );
  }

  const unlockedCount = list.filter((a) => a.unlocked).length;

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>成就徽章</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            已解锁 <strong style={{ color: '#4f46e5' }}>{unlockedCount}</strong> / {list.length} 枚勋章 · 继续学习解锁更多
          </p>
        </div>
        <Link to="/dashboard" className="btn btn--ghost">返回仪表盘</Link>
      </div>

      <div className="grid grid--cols-3" style={{ marginTop: 24 }}>
        {list.map((a) => (
          <div
            key={a.code}
            className="card"
            style={{
              opacity: a.unlocked ? 1 : 0.55,
              border: a.unlocked ? '2px solid #6366f1' : '1px solid #e2e8f0',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {a.unlocked && (
              <span
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#4f46e5',
                  background: '#eef2ff',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}
              >
                已解锁
              </span>
            )}
            <div style={{ fontSize: 48, marginBottom: 8, filter: a.unlocked ? 'none' : 'grayscale(1)' }}>
              {a.icon}
            </div>
            <h3 style={{ margin: '0 0 4px' }}>{a.name}</h3>
            <span className="badge" style={{ marginBottom: 8, display: 'inline-block' }}>
              {categoryLabel[a.category] ?? a.category}
            </span>
            <p className="muted" style={{ fontSize: 13, margin: '6px 0 0' }}>
              {a.description}
            </p>
            {a.unlocked && a.unlockedAt && (
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                解锁于 {formatRelativeTime(a.unlockedAt)}
              </div>
            )}
            {!a.unlocked && (
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                🔒 尚未解锁
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
