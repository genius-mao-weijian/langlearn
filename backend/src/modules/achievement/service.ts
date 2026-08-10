/**
 * Achievement Service — P1 成就激励系统
 *
 * 5 种勋章判定逻辑：
 *  1. first_login       用户首次登录（USER_REGISTERED 事件触发）
 *  2. streak_7          连续学习 7 天（EXERCISE_COMPLETED 后检查）
 *  3. exercises_100     累计完成 100 道练习（去重 exercise_id）
 *  4. perfect_streak_10 连续 10 题全对（按 created_at 顺序取最近 10 条 attempt）
 *  5. xp_500            累计 XP 达到 500
 *
 * 所有检查均为幂等：已解锁则跳过。
 * 解锁后发出 ACHIEVEMENT_UNLOCKED 事件（供后续通知模块使用）。
 */
import { query, queryOne } from '../shared/db.js';
import { eventBus, EventType } from '../shared/eventBus.js';
import type { AchievementDTO, ExerciseCompletedPayload } from '../shared/types.js';

interface AchievementDefRow {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  sort_order: number;
}

interface UserAchievementRow {
  id: string;
  user_id: string;
  achievement_code: string;
  unlocked_at: string;
}

/** 已解锁的 code 集合，避免重复授予 */
async function getUnlockedCodes(userId: string): Promise<Set<string>> {
  const rows = await query<Pick<UserAchievementRow, 'achievement_code'>>(
    'SELECT achievement_code FROM user_achievements WHERE user_id = $1',
    [userId],
  );
  return new Set(rows.map((r) => r.achievement_code));
}

/** 授予勋章（幂等），返回 true 表示新解锁 */
async function grant(userId: string, code: string): Promise<boolean> {
  try {
    await query(
      `INSERT INTO user_achievements (user_id, achievement_code)
       VALUES ($1, $2)
       ON CONFLICT (user_id, achievement_code) DO NOTHING`,
      [userId, code],
    );
  } catch {
    return false;
  }
  // 确认是否本次新插入
  const row = await queryOne<UserAchievementRow>(
    `SELECT id, user_id, achievement_code, unlocked_at
     FROM user_achievements
     WHERE user_id = $1 AND achievement_code = $2`,
    [userId, code],
  );
  if (!row) return false;

  // 检查是否在最近 3 秒内解锁（粗略判断是否为本次新授予）
  const ageMs = Date.now() - new Date(row.unlocked_at).getTime();
  const isFresh = ageMs < 3000;
  if (isFresh) {
    eventBus.emit(EventType.ACHIEVEMENT_UNLOCKED, {
      userId,
      achievementCode: code,
      unlockedAt: row.unlocked_at,
    });
  }
  return isFresh;
}

/** 1. 首次登录勋章 —— USER_REGISTERED 事件触发 */
export async function checkFirstLogin(userId: string): Promise<void> {
  await grant(userId, 'first_login');
}

/** 2. 连续学习 7 天 —— 检查 streakDays */
async function checkStreak7(userId: string): Promise<boolean> {
  // 复用 progress 模块的连击计算逻辑：从今天向前找连续天
  const days = await query<{ d: string }>(
    `SELECT DISTINCT created_at::date AS d
     FROM exercise_attempts
     WHERE user_id = $1
     ORDER BY d DESC
     LIMIT 7`,
    [userId],
  );
  if (days.length < 7) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let cursor = new Date(today);
  // 如果今天没答题，允许从昨天开始
  if (new Date(days[0].d).getTime() !== today.getTime()) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (new Date(days[0].d).getTime() !== yesterday.getTime()) return false;
    cursor = yesterday;
  }
  for (const row of days) {
    if (new Date(row.d).getTime() !== cursor.getTime()) return false;
    cursor.setDate(cursor.getDate() - 1);
  }
  return true;
}

/** 3. 累计 100 题（去重 exercise_id） */
async function checkExercises100(userId: string): Promise<boolean> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(DISTINCT exercise_id)::int AS count
     FROM exercise_attempts WHERE user_id = $1`,
    [userId],
  );
  return (row?.count ?? 0) >= 100;
}

/** 4. 连续 10 题全对（按时间倒序取最近 10 条，必须全部 is_correct） */
async function checkPerfectStreak10(userId: string): Promise<boolean> {
  const rows = await query<{ is_correct: boolean }>(
    `SELECT is_correct FROM exercise_attempts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId],
  );
  if (rows.length < 10) return false;
  return rows.every((r) => r.is_correct);
}

/** 5. 累计 XP 达 500 */
async function checkXp500(userId: string): Promise<boolean> {
  const row = await queryOne<{ sum: number | null }>(
    `SELECT COALESCE(SUM(xp_earned), 0)::int AS sum
     FROM exercise_attempts WHERE user_id = $1`,
    [userId],
  );
  return (row?.sum ?? 0) >= 500;
}

/**
 * 练习完成后触发所有练习相关勋章检查
 * 被 EXERCISE_COMPLETED 事件调用
 */
export async function checkAllAfterExercise(
  payload: ExerciseCompletedPayload,
): Promise<void> {
  const { userId } = payload;
  const unlocked = await getUnlockedCodes(userId);
  const checks: Array<{ code: string; fn: () => Promise<boolean> }> = [
    { code: 'streak_7', fn: () => checkStreak7(userId) },
    { code: 'exercises_100', fn: () => checkExercises100(userId) },
    { code: 'perfect_streak_10', fn: () => checkPerfectStreak10(userId) },
    { code: 'xp_500', fn: () => checkXp500(userId) },
  ];
  for (const c of checks) {
    if (unlocked.has(c.code)) continue;
    const met = await c.fn();
    if (met) {
      await grant(userId, c.code);
    }
  }
}

/** 获取用户全部勋章（含已解锁/未解锁状态），按 sort_order 排序 */
export async function getUserAchievements(
  userId: string,
): Promise<AchievementDTO[]> {
  const defs = await query<AchievementDefRow>(
    `SELECT id, code, name, description, icon, category, sort_order
     FROM achievement_definitions
     ORDER BY sort_order ASC, code ASC`,
  );
  const unlocked = await query<Pick<UserAchievementRow, 'achievement_code' | 'unlocked_at'>>(
    `SELECT achievement_code, unlocked_at
     FROM user_achievements
     WHERE user_id = $1`,
    [userId],
  );
  const unlockedMap = new Map(unlocked.map((u) => [u.achievement_code, u.unlocked_at]));
  return defs.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    description: d.description,
    icon: d.icon,
    category: d.category,
    unlocked: unlockedMap.has(d.code),
    unlockedAt: unlockedMap.get(d.code) ?? null,
  }));
}

/** 获取用户已解锁勋章数 */
export async function getUnlockedCount(userId: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM user_achievements WHERE user_id = $1',
    [userId],
  );
  return row?.count ?? 0;
}
