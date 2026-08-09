// ========== 学习中心：快速练习入口 + 听力 + 单词浏览 ==========
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { courseApi, learningApi } from '../lib/api';
import type { Course, ListeningMaterial, VocabularyItem } from '../lib/types';

type Tab = 'quick' | 'vocab' | 'listen';

// 种子数据中第一个单词/vocabulary 练习是固定的（英语 A1 入门第一课），
// 但为了通用，这里通过列表请求找到任一课程的任一课时的 vocabulary 练习
// 作为"快速开始"入口。

function LevelBadge({ level }: { level: string }) {
  return <span className="badge" style={{
    background: '#eef2ff', color: '#4338ca',
  }}>{level}</span>;
}

export default function LearnPage() {
  const [params] = useSearchParams();
  const courseId = params.get('courseId') ?? undefined;

  const [tab, setTab] = useState<Tab>('quick');
  const [courses, setCourses] = useState<Course[]>([]);
  const [vocab, setVocab] = useState<VocabularyItem[]>([]);
  const [listen, setListen] = useState<ListeningMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('A1');

  // 预加载：课程列表 + 单词 + 听力
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      courseApi.list({}),
      learningApi.vocabulary({ level, limit: 8 }),
      learningApi.listening({ level }),
    ])
      .then(([c, v, l]) => {
        if (cancelled) return;
        setCourses(c);
        setVocab(v);
        setListen(l);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [level]);

  // 为了快速练习入口：任一课程的首课时的首练习
  const quickLinks = useMemo(() => {
    // 先从 courseId 优先，否则找第一门
    const targets: Array<{ label: string; type: string; course?: Course }> = [
      { label: '📖 单词记忆 5 分钟', type: 'vocabulary' },
      { label: '🎧 听力训练 10 分钟', type: 'listening' },
      { label: '✏️ 语法练习 8 分钟', type: 'grammar' },
      { label: '🗣 口语跟读 5 分钟', type: 'speaking' },
    ];
    return targets.map((t) => ({ ...t }));
  }, []);

  const defaultFirstExercise = courses[0] ? `/courses/${courses[0].id}` : '/courses';

  return (
    <div className="container">
      <h1 style={{ margin: 0 }}>学习中心</h1>
      <p className="muted" style={{ marginTop: 4, marginBottom: 20 }}>
        选择一个模块，开启沉浸式练习。坚持 10 分钟 胜于 一次 100 分钟。
      </p>

      {/* 快速入口卡片 */}
      <section className="grid grid--cols-4" style={{ marginBottom: 24 }}>
        {quickLinks.map((t) => {
          const disabled = !courses.length && (t.type === 'grammar' || t.type === 'speaking');
          const href =
            t.type === 'vocabulary'
              ? defaultFirstExercise
              : t.type === 'listening'
                ? '#'
                : defaultFirstExercise;
          const onClick = (e: React.MouseEvent) => {
            if (t.type === 'listening') {
              e.preventDefault();
              setTab('listen');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          };
          return (
            <a
              key={t.type}
              href={href}
              onClick={onClick}
              className="card card--interactive"
              style={{ textDecoration: 'none', color: 'inherit', opacity: disabled ? 0.55 : 1 }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>{t.label}</h3>
              <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                {t.type === 'vocabulary' && '选择题形式，强化中英文映射'}
                {t.type === 'listening' && '查看听力原文 · 选项练习'}
                {t.type === 'grammar' && 'P1 上线：时态 / 从句 / 搭配'}
                {t.type === 'speaking' && 'P2 上线：TTS 示范 + 录音 + 评分'}
              </div>
            </a>
          );
        })}
      </section>

      {/* 进入具体课程的练习（若从课程详情页点"开始学习"） */}
      {courseId && courses.length > 0 && (
        <section className="card" style={{ marginBottom: 24 }}>
          <div className="card__title">
            <h3 style={{ margin: 0 }}>
              当前课程：{courses.find((c) => c.id === courseId)?.title ?? '未指定'}
            </h3>
            <Link to={`/courses/${courseId}`} className="muted" style={{ fontSize: 13 }}>查看大纲 →</Link>
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="filter-bar">
        <div className="chip-group">
          <button className={`chip ${tab === 'quick' ? 'chip--active' : ''}`} onClick={() => setTab('quick')}>每日一挑</button>
          <button className={`chip ${tab === 'vocab' ? 'chip--active' : ''}`} onClick={() => setTab('vocab')}>单词本</button>
          <button className={`chip ${tab === 'listen' ? 'chip--active' : ''}`} onClick={() => setTab('listen')}>听力训练</button>
        </div>
        {(tab === 'vocab' || tab === 'listen') && (
          <div className="chip-group">
            {['A1', 'A2', 'B1'].map((l) => (
              <button key={l}
                      className={`chip ${level === l ? 'chip--active' : ''}`}
                      onClick={() => setLevel(l)}>
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="center"><span className="spinner" /></div>
      ) : tab === 'quick' ? (
        <div className="card">
          <h3 style={{ margin: '0 0 6px' }}>每日挑战 🎯</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            任选 3 题完成，今日打卡 +1 XP
          </p>
          <div className="grid grid--cols-3" style={{ marginTop: 12 }}>
            {courses.slice(0, 3).map((c) => (
              <Link
                key={c.id}
                to={`/courses/${c.id}`}
                className="card card--interactive"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge--en">{c.language.toUpperCase()}</span>
                  <LevelBadge level={c.level} />
                </div>
                <h3 style={{ margin: '10px 0 4px' }}>{c.title}</h3>
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>{c.description}</p>
                <div className="course-card__footer">
                  <span>📚 {c.totalLessons} 课时</span>
                  <span>⏱ {c.estimatedHours}h</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : tab === 'vocab' ? (
        <div className="grid grid--cols-3">
          {vocab.length === 0 && <div className="empty" style={{ gridColumn: '1/-1' }}><div className="empty__icon">📖</div>暂无单词</div>}
          {vocab.map((v) => (
            <div key={v.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <LevelBadge level={v.level} />
              </div>
              <h3 style={{ margin: '10px 0 2px', fontSize: 22 }}>{v.word}</h3>
              {v.phonetic && <div className="muted" style={{ fontSize: 13 }}>{v.phonetic}</div>}
              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 600, color: '#4338ca' }}>
                {v.translation}
              </div>
              {v.exampleSentence && (
                <div style={{ marginTop: 10, fontSize: 13, color: '#475569', fontStyle: 'italic' }}>
                  「{v.exampleSentence}」
                </div>
              )}
              {v.exampleTranslation && (
                <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
                  —— {v.exampleTranslation}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid--cols-2">
          {listen.length === 0 && <div className="empty" style={{ gridColumn: '1/-1' }}><div className="empty__icon">🎧</div>暂无听力素材</div>}
          {listen.map((l) => (
            <div key={l.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <LevelBadge level={l.level} />
                <span className="badge badge--success">听力 · {l.durationSeconds}s</span>
              </div>
              <h3 style={{ margin: '10px 0 8px' }}>{l.title}</h3>
              {l.description && (
                <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>{l.description}</div>
              )}
              <details style={{ fontSize: 13, color: '#334155' }}>
                <summary style={{ cursor: 'pointer', color: '#6366f1' }}>查看原文 / 译文</summary>
                {l.transcript && (
                  <p style={{ marginTop: 8, padding: 10, background: '#f8fafc', borderRadius: 10, lineHeight: 1.7 }}>
                    {l.transcript}
                  </p>
                )}
                {l.translation && (
                  <p style={{ marginTop: 4, padding: 10, background: '#eef2ff', borderRadius: 10, lineHeight: 1.7, color: '#3730a3' }}>
                    {l.translation}
                  </p>
                )}
              </details>
              {!l.audioUrl && (
                <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                  🔈 音频文件待上传
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
