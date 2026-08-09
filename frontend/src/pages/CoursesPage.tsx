// ========== 课程列表页（API v2 数组版） ==========
import { useEffect, useState } from 'react';
import { courseApi } from '../lib/api';
import type { Course } from '../lib/types';
import CourseCard from '../components/CourseCard';

const languages = [
  { key: 'all', label: '全部' },
  { key: 'en', label: '🇬🇧 英语' },
  { key: 'ja', label: '🇯🇵 日语' },
  { key: 'ko', label: '🇰🇷 韩语' },
];
const levels = [
  { key: 'all', label: '全部等级' },
  { key: 'A1', label: 'A1 · 入门' },
  { key: 'A2', label: 'A2 · 初级' },
  { key: 'B1', label: 'B1 · 中级' },
  { key: 'B2', label: 'B2 · 中高级' },
  { key: 'C1', label: 'C1 · 高级' },
];

export default function CoursesPage() {
  const [list, setList] = useState<Course[]>([]);
  const [lang, setLang] = useState('all');
  const [level, setLevel] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    courseApi
      .list({
        language: lang === 'all' ? undefined : lang,
        level: level === 'all' ? undefined : level,
      })
      .then((res) => {
        if (cancelled) return;
        setList(res);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [lang, level]);

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0 }}>全部课程</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            共 <strong>{list.length}</strong> 门课程。选择适合你的目标语言和能力等级。
          </p>
        </div>
      </div>

      <div className="filter-bar">
        <span className="muted" style={{ fontSize: 13, marginRight: -4 }}>语言：</span>
        <div className="chip-group">
          {languages.map((l) => (
            <button
              key={l.key}
              className={`chip ${lang === l.key ? 'chip--active' : ''}`}
              onClick={() => setLang(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 13, margin: '0 -4px 0 6px' }}>等级：</span>
        <div className="chip-group">
          {levels.map((l) => (
            <button
              key={l.key}
              className={`chip ${level === l.key ? 'chip--active' : ''}`}
              onClick={() => setLevel(l.key)}
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
          <div className="empty__icon">🔍</div>
          没有匹配的课程。换一组筛选试试？
        </div>
      ) : (
        <div className="grid grid--cols-3">
          {list.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  );
}
