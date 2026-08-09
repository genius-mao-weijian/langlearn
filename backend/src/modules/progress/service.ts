/**
 * Progress Service（v2 适配前端落地 DTO）：
 *  - UserStatsDTO: totalExercises / totalXp / streakDays / studyMinutes
 *  - ProgressOverviewDTO: courseId + courseTitle + total/complete/completionRate
 *  - DashboardDTO: { user, stats, byLevel, recentExercises, recentAttempts, coursesProgress }
 *  - recordProgress 兼容新字段（correct -> isCorrect）并同时 upsert progress_records
 */
import { query, queryOne } from '../shared/db.js';
import type {
  UserStatsDTO,
  ProgressOverviewDTO,
  ProgressByLevelDTO,
  DashboardDTO,
  UserDTO,
  ExerciseCompletedPayload,
  ExerciseAttemptDTO,
} from '../shared/types.js';

interface ProgressRow {
  course_id: string;
  course_title: string;
  total_exercises: number;
  completed_exercises: number;
  correct_exercises: number;
  last_studied_at: string | null;
}
interface CountRow { count: number; }

interface RecentAttemptRow {
  id: string;
  exercise_id: string;
  is_correct: boolean;
  score: number | null;
  xp_earned: number | null;
  created_at: string;
}

function mapProgress(r: ProgressRow): ProgressOverviewDTO {
  const completionRate =
    r.total_exercises > 0
      ? Math.round((r.completed_exercises / r.total_exercises) * 100)
      : 0;
  return {
    courseId: r.course_id,
    courseTitle: r.course_title,
    totalExercises: r.total_exercises,
    completedExercises: r.completed_exercises,
    correctExercises: r.correct_exercises,
    completionRate,
    lastStudiedAt: r.last_studied_at,
  };
}

/**
 * 统计连续学习天数（连击）：从今天往前，只要当天有答题就+1，出现间断即停止。
 * studyMinutes：根据每道题约 2 分钟估算，可后续接入真实时长字段。
 */
export async function getUserStats(userId: string): Promise<UserStatsDTO> {
  const totalExercises =
    (
      await queryOne<CountRow>(
        'SELECT COUNT(DISTINCT exercise_id)::int AS count FROM exercise_attempts WHERE user_id = $1',
        [userId],
      )
    )?.count ?? 0;

  const totalXp =
    (
      await queryOne<{ sum: number | null }>(
        'SELECT COALESCE(SUM(xp_earned), 0)::int AS sum FROM exercise_attempts WHERE user_id = $1',
        [userId],
      )
    )?.sum ?? 0;

  // 连击：从今天向前，连续天数
  const days = await query<{ d: string }>(
    `SELECT DISTINCT created_at::date AS d
     FROM exercise_attempts
     WHERE user_id = $1
     ORDER BY d DESC`,
    [userId],
  );
  let streakDays = 0;
  if (days.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(today);
    for (const row of days) {
      const d = new Date(row.d);
      // 跳过早于 cursor 一天以上的（不连续）
      if (d.getTime() !== cursor.getTime()) {
        // 如果今天还没有答题，允许从昨天开始算（更友好）
        if (streakDays === 0) {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (d.getTime() === yesterday.getTime()) {
            cursor.setTime(yesterday.getTime());
            streakDays += 1;
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }
        }
        break;
      }
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // 学习时长估算：每题 2 分钟（P0）
  const attemptCount =
    (
      await queryOne<CountRow>(
        'SELECT COUNT(*)::int AS count FROM exercise_attempts WHERE user_id = $1',
        [userId],
      )
    )?.count ?? 0;
  const studyMinutes = attemptCount * 2;

  return {
    totalExercises,
    totalXp,
    streakDays,
    studyMinutes,
  };
}

export async function getProgressOverview(
  userId: string,
): Promise<ProgressOverviewDTO[]> {
  const rows = await query<ProgressRow>(
    `SELECT pr.course_id, c.title AS course_title, pr.total_exercises,
            pr.completed_exercises, pr.correct_exercises, pr.last_studied_at
     FROM progress_records pr
     JOIN courses c ON pr.course_id = c.id
     WHERE pr.user_id = $1
     ORDER BY pr.last_studied_at DESC NULLS LAST`,
    [userId],
  );
  return rows.map(mapProgress);
}

export async function getCourseProgress(
  userId: string,
  courseId: string,
): Promise<ProgressOverviewDTO | null> {
  const row = await queryOne<ProgressRow>(
    `SELECT pr.course_id, c.title AS course_title, pr.total_exercises,
            pr.completed_exercises, pr.correct_exercises, pr.last_studied_at
     FROM progress_records pr
     JOIN courses c ON pr.course_id = c.id
     WHERE pr.user_id = $1 AND pr.course_id = $2`,
    [userId, courseId],
  );
  return row ? mapProgress(row) : null;
}

export async function getProgressByLevel(userId: string): Promise<ProgressByLevelDTO[]> {
  // 按课程 level 聚合（去重 exercise_id 计算完成数，取所有练习做总数）
  const rows = await query<{
    level: string;
    total: number;
    completed: number;
  }>(
    `SELECT c.level,
            COUNT(DISTINCT e.id)::int AS total,
            COUNT(DISTINCT CASE WHEN ea.user_id = $1 THEN ea.exercise_id END)::int AS completed
     FROM courses c
     LEFT JOIN lessons l ON l.course_id = c.id
     LEFT JOIN exercises e ON e.lesson_id = l.id
     LEFT JOIN exercise_attempts ea ON ea.exercise_id = e.id
     GROUP BY c.level
     HAVING COUNT(DISTINCT e.id) > 0
     ORDER BY c.level ASC`,
    [userId],
  );
  return rows.map((r) => ({
    level: r.level,
    totalExercises: r.total,
    completedExercises: r.completed,
    completionRate:
      r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0,
  }));
}

export async function getRecentAttempts(
  userId: string,
  limit = 10,
): Promise<ExerciseAttemptDTO[]> {
  const rows = await query<RecentAttemptRow>(
    `SELECT id, exercise_id, is_correct, score, xp_earned, created_at
     FROM exercise_attempts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    userId,
    exerciseId: r.exercise_id,
    correct: r.is_correct,
    score: r.score ?? 0,
    xpEarned: r.xp_earned ?? 0,
    attemptedAt: r.created_at,
  }));
}

/** 聚合 Dashboard，前端仪表盘单接口查询 */
export async function getDashboard(userId: string, user: UserDTO): Promise<DashboardDTO> {
  const [stats, byLevel, recent, coursesProgress] = await Promise.all([
    getUserStats(userId),
    getProgressByLevel(userId),
    getRecentAttempts(userId, 10),
    getProgressOverview(userId),
  ]);
  // recentExercises 与 recentAttempts 对齐：取最近做过的去重练习 id（P0 简化）
  const recentExercises = Array.from(new Set(recent.map((a) => a.exerciseId))).slice(0, 10);
  return {
    user,
    stats,
    byLevel,
    recentExercises,
    recentAttempts: recent,
    coursesProgress,
  };
}

/**
 * 记录学习进度（事件处理器）
 * 兼容新 payload 字段（correct / score / xpEarned 等），更新 progress_records。
 */
export async function recordProgress(
  payload: ExerciseCompletedPayload,
): Promise<void> {
  const { userId, courseId } = payload;
  const totalRow = await queryOne<CountRow>(
    `SELECT COUNT(*)::int AS count
     FROM exercises e
     JOIN lessons l ON e.lesson_id = l.id
     WHERE l.course_id = $1`,
    [courseId],
  );
  const totalExercises = totalRow?.count ?? 0;

  const completedRow = await queryOne<CountRow>(
    `SELECT COUNT(DISTINCT ea.exercise_id)::int AS count
     FROM exercise_attempts ea
     JOIN exercises e ON ea.exercise_id = e.id
     JOIN lessons l ON e.lesson_id = l.id
     WHERE ea.user_id = $1 AND l.course_id = $2`,
    [userId, courseId],
  );
  const completedExercises = completedRow?.count ?? 0;

  const correctRow = await queryOne<CountRow>(
    `SELECT COUNT(DISTINCT ea.exercise_id)::int AS count
     FROM exercise_attempts ea
     JOIN exercises e ON ea.exercise_id = e.id
     JOIN lessons l ON e.lesson_id = l.id
     WHERE ea.user_id = $1 AND l.course_id = $2 AND ea.is_correct = true`,
    [userId, courseId],
  );
  const correctExercises = correctRow?.count ?? 0;

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM progress_records WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId],
  );

  if (existing) {
    await query(
      `UPDATE progress_records
       SET total_exercises = $3,
           completed_exercises = $4,
           correct_exercises = $5,
           last_studied_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId, totalExercises, completedExercises, correctExercises],
    );
  } else {
    await query(
      `INSERT INTO progress_records
         (user_id, course_id, total_exercises, completed_exercises, correct_exercises, last_studied_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, courseId, totalExercises, completedExercises, correctExercises],
    );
  }
}
