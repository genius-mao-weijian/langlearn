// ========== 共享 UI：课程卡片 ==========
import type { Course } from '../lib/types';
import { Link } from 'react-router-dom';

interface Props {
  course: Course;
}

const levelColor: Record<string, string> = {
  A1: '#e0e7ff', A2: '#dbeafe',
  B1: '#dcfce7', B2: '#fef9c3',
  C1: '#fce7f3', C2: '#fed7aa',
};
const levelText: Record<string, string> = {
  A1: '#3730a3', A2: '#1e40af',
  B1: '#166534', B2: '#854d0e',
  C1: '#9d174d', C2: '#9a3412',
};

const langBadge: Record<string, string> = {
  en: 'badge--en', ja: 'badge--ja', ko: 'badge--ko', zh: 'badge--zh',
};
const langFlag: Record<string, string> = {
  en: '🇬🇧', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳',
};
const langName: Record<string, string> = {
  en: '英语', ja: '日语', ko: '韩语', zh: '中文',
};

export default function CourseCard({ course }: Props) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="card card--interactive course-card"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <div
          className="course-card__icon"
          style={{ background: levelColor[course.level] ?? '#e2e8f0' }}
        >
          {langFlag[course.language] ?? '🌏'}
        </div>
        <div>
          <h3 className="card__title" style={{ display: 'block' }}>
            <span style={{ color: '#0f172a' }}>{course.title}</span>
          </h3>
          <div className="course-card__meta">
            <span className={`badge ${langBadge[course.language] ?? ''}`}>
              {langName[course.language] ?? course.language}
            </span>
            <span
              className="badge"
              style={{
                background: levelColor[course.level] ?? '#e2e8f0',
                color: levelText[course.level] ?? '#334155',
              }}
            >
              {course.level}
            </span>
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: 14, margin: '6px 0 0' }}>
        {course.description}
      </p>
      <div className="course-card__footer">
        <span>📚 {course.totalLessons} 课时</span>
        <span>⏱ {course.estimatedHours} 小时</span>
      </div>
    </Link>
  );
}
