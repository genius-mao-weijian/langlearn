// ========== 学习进度仪表盘（API v2 DashboardDTO 单接口版） ==========
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { progressApi } from '../lib/api';
import type { DashboardDTO } from '../lib/types';

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

export default function DashboardPage() {
  const [params] = useSearchParams();
  const welcome = params.get('welcome') === '1';
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [dash, setDash] = useState<DashboardDTO | null>(null);

  useEffect(() => {
    let cancelled = false;
    progressApi
      .dashboard()
      .then((d) => { if (!cancelled) setDash(d); })
      .catch((e) => !cancelled && setErr(e?.message ?? '加载失败'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="container center"><span className="spinner" /></div>;
  if (err || !dash) {
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

  const { user, stats, byLevel, recentAttempts, coursesProgress } = dash;
  const totalExercises = byLevel.reduce((s, l) => s + l.totalExercises, 0);
  const completedExercises = byLevel.reduce((s, l) => s + l.completedExercises, 0);
  const completionRate = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
  const lastStudiedAt = recentAttempts[0]?.attemptedAt ?? null;

  return (
    <div className="container">
      {welcome && (
        <div className="alert alert--success" style={{ marginBottom: 16 }}>
          🎉 欢迎加入 LangLearn，{user.nickname}！从一节 5 分钟的单词课开始，养成每天学习的习惯吧。
        </div>
      )}

      <div className="dashboard">
        {/* 问候 */}
        <div className="dash__greet card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h2 style={{ margin: 0 }}>
                {user.nickname}，今天也要继续学习 🌱
              </h2>
              <p className="muted" style={{ marginTop: 4, marginBottom: 0 }}>
                上次活跃：{formatRelativeTime(lastStudiedAt)}
                {stats.streakDays > 0 && (
                  <> · 当前连续打卡 <strong style={{ color: '#f59e0b' }}>{stats.streakDays}</strong> 天 🔥</>
                )}
              </p>
            </div>
            <div>
              <Link to="/learn" className="btn btn--primary">开始今日练习 →</Link>
            </div>
          </div>
        </div>

        {/* 完成率 */}
        <div className="card dash--rate">
          <div className="dash-stat__label">完成率</div>
          <div className="dash-stat__value">{completionRate}%</div>
          <div style={{ marginTop: 12 }}>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${Math.min(100, completionRate)}%` }} />
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {completedExercises} / {totalExercises} 题
            </div>
          </div>
        </div>

        {/* XP */}
        <div className="card dash--xp">
          <div className="dash-stat__label">累计 XP</div>
          <div className="dash-stat__value" style={{ color: '#4f46e5' }}>{stats.totalXp}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            继续完成练习，解锁成就徽章
          </div>
        </div>

        {/* 连击 */}
        <div className="card dash--streak">
          <div className="dash-stat__label">连续学习</div>
          <div className="dash-stat__value" style={{ color: '#f59e0b' }}>
            {stats.streakDays} <span style={{ fontSize: 16, fontWeight: 600 }}>天</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {stats.streakDays >= 7 ? '🏅 已连续一周！' : '明天再来打卡 +1'}
          </div>
        </div>

        {/* 总学习时长 */}
        <div className="card dash--time">
          <div className="dash-stat__label">总学习时长</div>
          <div className="dash-stat__value" style={{ color: '#10b981' }}>{stats.studyMinutes}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            ≈ {Math.round((stats.studyMinutes / 60) * 10) / 10} 小时
          </div>
        </div>

        {/* 按等级进度 + 课程进度 */}
        <div className="card dash--chart">
          <div className="card__title">
            <h3 style={{ margin: 0 }}>按等级完成度</h3>
          </div>
          <div className="level-progress">
            {byLevel.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>暂无练习记录，完成第一次练习后显示</div>
            ) : byLevel.map((l) => (
              <div key={l.level} className="level-progress__row">
                <span className="badge">{l.level}</span>
                <div className="progress-bar">
                  <div
                    className={`progress-bar__fill${l.completionRate >= 80 ? ' progress-bar__fill--success' : l.completionRate <= 20 ? ' progress-bar__fill--warning' : ''}`}
                    style={{ width: `${Math.min(100, l.completionRate)}%` }}
                  />
                </div>
                <span style={{ textAlign: 'right', fontWeight: 600 }}>{l.completionRate}%</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <h3 style={{ margin: '0 0 10px' }}>我的课程进度</h3>
            {coursesProgress.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                还没有学习任何课程，<Link to="/courses">去挑一门课吧</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {coursesProgress.map((c) => (
                  <div key={c.courseId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{c.courseTitle}</span>
                      <span className="muted">{c.completionRate}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar__fill" style={{ width: `${Math.min(100, c.completionRate)}%` }} />
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                      答对 {c.correctExercises}/{c.totalExercises} 题 · 最近：{formatRelativeTime(c.lastStudiedAt)}
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
            <span className="muted" style={{ fontSize: 12 }}>最近 {recentAttempts.length} 条</span>
          </div>
          {recentAttempts.length === 0 ? (
            <div className="empty">
              <div className="empty__icon">🏁</div>
              暂无练习记录，<Link to="/learn">去做第一题</Link>
            </div>
          ) : (
            <ul className="activity-list">
              {recentAttempts.map((r) => (
                <li key={r.id} className="activity-item">
                  <div>
                    <span className={`activity-item__score ${r.correct ? 'activity-item__score--ok' : 'activity-item__score--bad'}`}>
                      {r.correct ? '✅' : '❌'} {r.score} 分
                    </span>
                    <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                      {formatRelativeTime(r.attemptedAt)}
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
