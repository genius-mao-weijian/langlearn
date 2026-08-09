// ========== 练习页：支持选择题提交、展示判分、XP 奖励 ==========
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { learningApi } from '../lib/api';
import type { Exercise, SubmitResult } from '../lib/types';
import { useAuth } from '../lib/authStore';

const typeLabel: Record<string, string> = {
  vocabulary: '📖 单词记忆',
  grammar: '✏️ 语法练习',
  listening: '🎧 听力训练',
  speaking: '🗣 口语跟读',
};

export default function ExercisePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const isAuthed = useAuth((s) => s.isAuthed);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [notAuthedTip, setNotAuthedTip] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErr(null);
    setSelected(null);
    setResult(null);
    try {
      const r = await learningApi.getExercise(id);
      setExercise(r.exercise);
    } catch (e: any) {
      setErr(e?.message ?? '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async () => {
    if (!id || !selected || !exercise) return;
    if (!isAuthed) {
      setNotAuthedTip(true);
      return;
    }
    setSubmitting(true);
    setNotAuthedTip(false);
    try {
      const r = await learningApi.submitExercise(id, selected);
      setResult(r);
    } catch (e: any) {
      setErr(e?.message ?? '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container center"><span className="spinner" /></div>;
  if (err || !exercise) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="empty__icon">🫠</div>
          <h2>练习无法加载</h2>
          <p className="muted">{err ?? ''}</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 10 }}>
            <button className="btn btn--ghost" onClick={load}>重试</button>
            <Link to="/learn" className="btn btn--primary">去学习中心</Link>
          </div>
        </div>
      </div>
    );
  }

  const optionState = (opt: string): 'correct' | 'wrong' | 'selected' | undefined => {
    if (!result) {
      return selected === opt ? 'selected' : undefined;
    }
    if (opt === result.correctAnswer) return 'correct';
    if (opt === selected && !result.correct) return 'wrong';
    return undefined;
  };

  return (
    <div className="container container--narrow">
      <Link to="/learn" className="muted" style={{ fontSize: 13 }}>← 返回学习中心</Link>
      <div style={{ height: 14 }} />

      <div className="question-card">
        <div className="question-card__type">
          {typeLabel[exercise.type] ?? exercise.type} · {exercise.level}
        </div>
        <h1 className="question-card__prompt">{exercise.prompt}</h1>
        {exercise.instructions && (
          <p className="question-card__instruction">{exercise.instructions}</p>
        )}

        {notAuthedTip && (
          <div className="alert alert--error">
            提交练习需先登录。
            <span style={{ marginLeft: 8 }}>
              <Link to="/login" className="btn btn--sm btn--primary"
                    style={{ color: '#fff', textDecoration: 'none' }}>去登录</Link>
            </span>
          </div>
        )}

        {exercise.options && exercise.options.length > 0 ? (
          <div className="option-list">
            {exercise.options.map((opt, idx) => {
              const st = optionState(opt);
              return (
                <button
                  key={opt}
                  disabled={!!result}
                  className={`option ${st ? `option--${st}` : ''}`}
                  onClick={() => setSelected(opt)}
                >
                  <span className="option__idx">{String.fromCharCode(65 + idx)}</span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__icon">🎧</div>
            开放式练习尚未提供音频文件，请先在学习中心选择「单词记忆」练习。
          </div>
        )}

        {result && (
          <div className={`question-result question-result--${result.correct ? 'correct' : 'wrong'}`}>
            <strong style={{ fontSize: 16 }}>
              {result.correct ? '✅ 回答正确！' : '❌ 回答有误'}
            </strong>
            <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.8 }}>
              <div>
                得分：<strong>{result.score}</strong> / 100 ·
                <span className="question-result__xp"> +{result.xpEarned} XP</span>
              </div>
              {!result.correct && result.correctAnswer && (
                <div>正确答案：<strong>{result.correctAnswer}</strong></div>
              )}
              <div>
                掌握度：{result.updatedMastery - result.masteryDelta >= 0 ? '+' : ''}
                {result.masteryDelta} → <strong>{result.updatedMastery}%</strong>
              </div>
              {result.explanation && (
                <div style={{ color: result.correct ? '#065f46' : '#991b1b' }}>
                  💡 {result.explanation}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' }}>
          {!result ? (
            <>
              <button
                className="btn btn--primary"
                disabled={!selected || submitting}
                onClick={onSubmit}
              >
                {submitting ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> 提交中…</> : '提交答案'}
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => nav('/learn')}
              >
                返回
              </button>
            </>
          ) : (
            <>
              <button className="btn btn--primary" onClick={() => nav('/learn')}>
                继续下一题
              </button>
              <Link to="/dashboard" className="btn btn--ghost">查看我的进度</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
