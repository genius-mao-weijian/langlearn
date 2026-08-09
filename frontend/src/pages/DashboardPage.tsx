// ========== 学习进度仪表盘 ==========
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { progressApi } from '../lib/api';
import type { ProgressOverview } from '../lib/types';

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '从未';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

interface RecentItem {
  exerciseId: string;
  score: number;
  correct: boolean;
  xpEarned: number;
  submittedAt: string;
}

export default function DashboardPage() {
  const [params] = useSearchParams();
  const welcome = params.get('welcome') === '1';
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([progressApi.overview(), progressApi.recent(20)])
      .then(([o, r]) => {
        if (cancelled) return;
        setOverview(o);
        setRecent(r.items);
      })
      .catch((e) => !cancelled && setErr(e?.message ?? '加载失败'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="container center"><span className="spinner" /></div>;
  if (err || !overview) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="empty__icon">🔌</div>
          <h2>加载失败</h2>
          <p className="muted">{err ?? ''}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {welcome && (
        <div className="alert alert--success" style={{ marginBottom: 16 }}>
          🎉 欢迎加入 LangLearn！从一节 5 分钟的单词课开始，养成每天学习的习惯吧。
        </div>
      )}

      <div className="dashboard">
        {/* 问候 */}
        <div className="dash__greet card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0 }}>
                今天也要继续学习 🌱
              </h2>
              <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>
                上次活跃：{formatRelativeTime(overview.lastActiveAt)}
                {overview.streakDays > 0 && <> · 当前连续打卡 <strong style={{ color: '#f59e0b' }}>{overview.streakDays}</strong> 天 🔥</>}
              </p>
            </div>
            <div>
              <Link to="/learn" className="btn btn--primary">开始今日练习 →</Link>
            </div>
          </div>
        </div>

        {/* 统计 4 卡 */}
        <div className="card dash--rate">
          <div className="dash-stat__label">完成率</div>
          <div className="dash-stat__value">{Math.round(overview.completionRate)}%</div>
          <div style={{ marginTop: 12 }}>
            <div className="progress-bar">
              <div className="progress-bar__fill"
                style={{ width: `${Math.min(100, overview.completionRate)}%` }} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {overview.completedExercises} / {overview.totalExercises} 题
            </div>
          </div>
        </div>

        <div className="card dash--xp">
          <div className="dash-stat__label">累计 XP</div>
          <div className="dash-stat__value" style={{ color: '#4f46e5' }}>{overview.totalXp}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            继续完成练习，解锁成就徽章
          </div>
        </div>

        <div className="card dash--streak">
          <div className="dash-stat__label">连续学习</div>
          <div className="dash-stat__value" style={{ color: '#f59e0b' }}>{overview.streakDays} <span style={{ fontSize: 16, fontWeight: 600 }}>天</span></div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {overview.streakDays >= 7 ? '🏅 已连续一周！' : '明天再来打卡 +1'}
          </div>
        </div>

        <div className="card dash--time">
          <div className="dash-stat__label">总学习时长</div>
          <div className="dash-stat__value" style={{ color: '#10b981' }}>{overview.totalMinutes}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            ≈ {Math.round(overview.totalMinutes / 60 * 10) / 10} 小时
          </div>
        </div>

        {/* 按等级进度 */}
        <div className="card dash--chart">
          <div className="card__title">
            <h3 style={{ margin: 0 }}>按等级完成度</h3>
          </div>
          <div className="level-progress">
            {overview.byLevel.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>暂无练习记录，完成第一次练习后显示</div>
            ) : overview.byLevel.map((l) => (
              <div key={l.level} className="level-progress__row">
                <span className="badge">{l.level}</span>
                <div className="progress-bar">
                  <div
                    className={`progress-bar__fill${l.rate >= 80 ? ' progress-bar__fill--success' : l.rate <= 20 ? ' progress-bar__fill--warning' : ''}`}
                    style={{ width: `${Math.min(100, l.rate)}%` }}
                  />
                </div>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{Math.round(l.rate)}%</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 10px' }}>我的课程进度</h3>
            {overview.courses.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>还没有学习任何课程</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {overview.courses.map((c) => (
                  <div key={c.courseId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{c.courseTitle}</span>
                      <span className="muted">{Math.round(c.progress)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar__fill" style={{ width: `${Math.min(100, c.progress)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="card dash--list">
          <div className="card__title">
            <h3 style={{ margin: 0 }}>最近练习记录</h3>
            <span className="muted" style={{ fontSize: 12 }}>最近 20 条</span>
          </div>
          {recent.length === 0 ? (
            <div className="empty">
              <div className="empty__icon">🏁</div>
              暂无练习记录，<Link to="/learn">去做第一题</Link>
            </div>
          ) : (
            <ul className="activity-list">
              {recent.map((r, i) => (
                <li key={`${r.exerciseId}-${i}`} className="activity-item">
                  <div>
                    <span className={`activity-item__score ${r.correct ? 'activity-item__score--ok' : 'activity-item__score--bad'}`}>
                      {r.correct ? '✅' : '❌'} {r.score} 分
                    </span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                      {formatRelativeTime(r.submittedAt)}
                    </span>
                  </div>
                  <div>
                    <span className="activity-item__xp">+{r.xpEarned} XP</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
