// ========== 课程详情页 ==========
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { courseApi } from '../lib/api';
import type { Course, Lesson } from '../lib/types';

const langFlag: Record<string, string> = {
  en: '🇬🇧', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
};
const langName: Record<string, string> = {
  en: '英语', ja: '日语', ko: '韩语', zh: '中文',
};

export default function CourseDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([courseApi.get(id), courseApi.getLessons(id)])
      .then(([c, l]) => {
        if (cancelled) return;
        setCourse(c.course);
        setLessons(l.items);
      })
      .catch((e) => !cancelled && setErr(e?.message ?? '加载失败'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="container center"><span className="spinner" /></div>;
  if (err || !course) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="empty__icon">😅</div>
          <h2>课程不存在或加载失败</h2>
          <p className="muted">{err ?? ''}</p>
          <button className="btn btn--primary" onClick={() => nav('/courses')}>返回课程列表</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Link to="/courses" className="muted" style={{ fontSize: 13 }}>← 返回课程列表</Link>
      <div style={{ height: 16 }} />

      <div className="card">
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background:
                'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(16,185,129,0.15))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              border: '1px solid #e0e7ff',
            }}
          >
            {langFlag[course.language] ?? '🌏'}
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <span className="badge">{langName[course.language] ?? course.language}</span>
              <span className="badge">{course.level}</span>
            </div>
            <h1 style={{ margin: '0 0 6px' }}>{course.title}</h1>
            <p className="muted" style={{ margin: '0 0 14px' }}>{course.description}</p>
            <div style={{ display: 'flex', gap: 24, fontSize: 14, color: '#475569' }}>
              <span>📚 {course.totalLessons} 课时</span>
              <span>⏱ 约 {course.estimatedHours} 小时</span>
            </div>
          </div>
          <div>
            <Link to={`/learn?courseId=${course.id}`} className="btn btn--primary">
              ▶ 开始学习
            </Link>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />
      <div className="grid grid--cols-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card__title">
            <h3 style={{ margin: 0 }}>课程大纲（{lessons.length} 课时）</h3>
          </div>
          <div className="lesson-list">
            {lessons.map((l) => (
              <div key={l.id} className="lesson-row">
                <div className="lesson-row__index">{String(l.sequence).padStart(2, '0')}</div>
                <div className="lesson-row__main">
                  <div className="lesson-row__title">{l.title}</div>
                  <div className="lesson-row__desc">{l.description}</div>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  练习 {l.exerciseIds.length} 个
                </div>
                <Link
                  to={l.exerciseIds[0] ? `/exercise/${l.exerciseIds[0]}` : '/learn'}
                  className="btn btn--sm btn--ghost"
                  onClick={(e) => !l.exerciseIds[0] && e.preventDefault()}
                  style={!l.exerciseIds[0] ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                >
                  开始练习
                </Link>
              </div>
            ))}
            {lessons.length === 0 && (
              <div className="empty">
                <div className="empty__icon">📝</div>
                课程大纲维护中，稍后再来
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
