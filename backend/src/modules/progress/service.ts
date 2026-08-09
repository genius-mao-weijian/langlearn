/**
 * 进度追踪模块业务逻辑（progress service）
 *
 * 职责：学习进度概览查询、单课程进度详情查询、以及练习完成后的进度记录。
 *
 * 【数据更新机制】
 * 进度不由用户通过 HTTP 直接写入，而是由 learning 模块在练习完成时
 * 发布 EXERCISE_COMPLETED 事件，本模块的 recordProgress 作为事件处理器被调用，
 * 异步更新 progress_records 表（事件驱动解耦）。
 *
 * 【统计口径（P0 简化版）】
 * - totalExercises：该课程下所有练习的总数（COUNT exercises JOIN lessons）
 * - completedExercises：该用户在该课程下 exercise_attempts 中去重的 exercise_id 数量
 * - correctExercises：该用户在该课程下 is_correct=true 的去重 exercise_id 数量
 * （去重是为了避免用户重复答题导致进度虚高）
 */
import { query, queryOne } from '../shared/db.js';
import type { ProgressOverviewDTO, ExerciseCompletedPayload } from '../shared/types.js';

/**
 * 进度查询结果行类型（含 JOIN courses 得到的课程标题）
 */
interface ProgressRow {
  course_id: string;
  course_title: string;
  total_exercises: number;
  completed_exercises: number;
  correct_exercises: number;
  last_studied_at: string | null;
}

/**
 * COUNT 查询结果行类型
 * 使用 ::int 转换，pg 驱动会将 int4 解析为 JS number
 */
interface CountRow {
  count: number;
}

/**
 * 将进度行映射为 ProgressOverviewDTO（snake_case -> camelCase）
 * 并计算完成率 completionRate = completedExercises / totalExercises * 100
 */
function mapToProgressDTO(row: ProgressRow): ProgressOverviewDTO {
  const completionRate =
    row.total_exercises > 0
      ? (row.completed_exercises / row.total_exercises) * 100
      : 0;
  return {
    courseId: row.course_id,
    courseTitle: row.course_title,
    totalExercises: row.total_exercises,
    completedExercises: row.completed_exercises,
    correctExercises: row.correct_exercises,
    completionRate,
    lastStudiedAt: row.last_studied_at,
  };
}

/**
 * 查询用户所有课程的进度概览
 * JOIN courses 表获取课程标题，仅返回用户已有进度记录的课程。
 *
 * @param userId 用户 ID
 * @returns 进度概览列表
 */
export async function getProgressOverview(
  userId: string
): Promise<ProgressOverviewDTO[]> {
  const rows = await query<ProgressRow>(
    `SELECT pr.course_id, c.title AS course_title, pr.total_exercises,
            pr.completed_exercises, pr.correct_exercises, pr.last_studied_at
     FROM progress_records pr
     JOIN courses c ON pr.course_id = c.id
     WHERE pr.user_id = $1
     ORDER BY pr.last_studied_at DESC NULLS LAST`,
    [userId]
  );
  return rows.map(mapToProgressDTO);
}

/**
 * 查询用户某课程的详细进度
 *
 * @param userId   用户 ID
 * @param courseId 课程 ID
 * @returns 进度概览或 null（无进度记录）
 */
export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<ProgressOverviewDTO | null> {
  const row = await queryOne<ProgressRow>(
    `SELECT pr.course_id, c.title AS course_title, pr.total_exercises,
            pr.completed_exercises, pr.correct_exercises, pr.last_studied_at
     FROM progress_records pr
     JOIN courses c ON pr.course_id = c.id
     WHERE pr.user_id = $1 AND pr.course_id = $2`,
    [userId, courseId]
  );
  return row ? mapToProgressDTO(row) : null;
}

/**
 * 记录学习进度（事件处理器）
 * 由 eventBus 在 EXERCISE_COMPLETED 事件时调用，异步更新 progress_records。
 *
 * P0 简化逻辑：
 *   1. 统计该课程下练习总数（total_exercises）
 *   2. 统计该用户在该课程下去重的已完成练习数（completed_exercises）
 *   3. 统计该用户在该课程下去重的正确练习数（correct_exercises）
 *   4. 查询或创建 progress_records 记录，并 upsert 上述统计值
 *
 * 注意：payload 已携带 courseId，此处直接信任；
 * 若需更强一致性可重新 JOIN 校验 exercise -> lesson -> course 关系。
 *
 * @param payload 练习完成事件载荷
 */
export async function recordProgress(
  payload: ExerciseCompletedPayload
): Promise<void> {
  const { userId, courseId } = payload;

  // 1. 统计该课程下所有练习的总数（exercises JOIN lessons）
  const totalRow = await queryOne<CountRow>(
    `SELECT COUNT(*)::int AS count
     FROM exercises e
     JOIN lessons l ON e.lesson_id = l.id
     WHERE l.course_id = $1`,
    [courseId]
  );
  const totalExercises = totalRow?.count ?? 0;

  // 2. 统计该用户在该课程下去重的已完成练习数（COUNT DISTINCT exercise_id）
  const completedRow = await queryOne<CountRow>(
    `SELECT COUNT(DISTINCT ea.exercise_id)::int AS count
     FROM exercise_attempts ea
     JOIN exercises e ON ea.exercise_id = e.id
     JOIN lessons l ON e.lesson_id = l.id
     WHERE ea.user_id = $1 AND l.course_id = $2`,
    [userId, courseId]
  );
  const completedExercises = completedRow?.count ?? 0;

  // 3. 统计该用户在该课程下去重的正确练习数（is_correct=true）
  const correctRow = await queryOne<CountRow>(
    `SELECT COUNT(DISTINCT ea.exercise_id)::int AS count
     FROM exercise_attempts ea
     JOIN exercises e ON ea.exercise_id = e.id
     JOIN lessons l ON e.lesson_id = l.id
     WHERE ea.user_id = $1 AND l.course_id = $2 AND ea.is_correct = true`,
    [userId, courseId]
  );
  const correctExercises = correctRow?.count ?? 0;

  // 4. 查询是否已有该 user_id + course_id 的进度记录（UNIQUE 约束保证唯一）
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM progress_records WHERE user_id = $1 AND course_id = $2`,
    [userId, courseId]
  );

  if (existing) {
    // 已有记录：更新统计值与最近学习时间
    await query(
      `UPDATE progress_records
       SET total_exercises = $3,
           completed_exercises = $4,
           correct_exercises = $5,
           last_studied_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $1 AND course_id = $2`,
      [userId, courseId, totalExercises, completedExercises, correctExercises]
    );
  } else {
    // 无记录：创建新记录（首次学习该课程）
    await query(
      `INSERT INTO progress_records
         (user_id, course_id, total_exercises, completed_exercises, correct_exercises, last_studied_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [userId, courseId, totalExercises, completedExercises, correctExercises]
    );
  }
}
