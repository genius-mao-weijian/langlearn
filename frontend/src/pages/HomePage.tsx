// ========== 首页 ==========
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseApi } from '../lib/api';
import type { Course } from '../lib/types';
import CourseCard from '../components/CourseCard';

const languages = [
  { key: 'all', label: '全部' },
  { key: 'en', label: '🇬🇧 英语' },
  { key: 'ja', label: '🇯🇵 日语' },
  { key: 'ko', label: '🇰🇷 韩语' },
];

export default function HomePage() {
  const [list, setList] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [lang, setLang] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    courseApi
      .list({ language: lang === 'all' ? undefined : lang })
      .then((res) => {
        if (cancelled) return;
        setList(res.items);
        setTotal(res.total);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [lang]);

  return (
    <div className="container">
      {/* Hero */}
      <section className="hero">
        <div>
          <span className="hero__eyebrow">沉浸式语言学习 · 免费体验</span>
          <h1 className="hero__title">
            用最自然的方式<br />
            学会 <span style={{ color: '#4f46e5' }}>英语 / 日语 / 韩语</span>
          </h1>
          <p className="hero__subtitle">
            分级课程体系 · 互动式学习模块 · 学习进度追踪 · 个性化学习路径 · 社区交流与成就激励 —— 让坚持学习成为习惯。
          </p>
          <div className="hero__actions">
            <Link to="/register" className="btn btn--primary">🚀 免费开始学习</Link>
            <Link to="/courses" className="btn btn--ghost">浏览全部课程</Link>
          </div>
          <div className="hero__stats">
            <div className="stat">
              <div className="stat__label">课程</div>
              <div className="stat__value">{total}</div>
            </div>
            <div className="stat">
              <div className="stat__label">语言</div>
              <div className="stat__value">3</div>
            </div>
            <div className="stat">
              <div className="stat__label">练习</div>
              <div className="stat__value">∞</div>
            </div>
          </div>
        </div>
        <div className="hero__visual" aria-hidden>
          <span className="hero__flag hero__flag--1">🇬🇧</span>
          <span className="hero__flag hero__flag--2">🇯🇵</span>
          <span className="hero__flag hero__flag--3">🇰🇷</span>
        </div>
      </section>

      {/* 推荐课程 */}
      <section style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0 }}>推荐课程</h2>
          <Link to="/courses" className="muted" style={{ fontSize: 14 }}>查看全部 →</Link>
        </div>
        <div className="filter-bar">
          <div className="chip-group" role="tablist">
            {languages.map((l) => (
              <button
                key={l.key}
                role="tab"
                aria-selected={lang === l.key}
                className={`chip ${lang === l.key ? 'chip--active' : ''}`}
                onClick={() => setLang(l.key)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="center"><span className="spinner" /></div>
        ) : list.length === 0 ? (
          <div className="empty">
            <div className="empty__icon">📚</div>
            暂无匹配的课程
          </div>
        ) : (
          <div className="grid grid--cols-3">
            {list.map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}
