/**
 * Achievement Routes — P1 成就激励系统路由
 *  - GET /achievements      获取当前用户全部勋章（含已解锁/未解锁状态）
 *  - GET /achievements/count 获取当前用户已解锁勋章数（给 Dashboard 用）
 *
 * 事件订阅：
 *  - EXERCISE_COMPLETED → checkAllAfterExercise（检查 4 种练习相关勋章）
 *  - USER_REGISTERED    → checkFirstLogin（授予首登勋章）
 */
import { Router, Response } from 'express';
import { authMiddleware } from '../shared/authMiddleware.js';
import { eventBus, EventType } from '../shared/eventBus.js';
import type { AuthenticatedRequest, ApiResponse, ExerciseCompletedPayload } from '../shared/types.js';
import { getUserAchievements, getUnlockedCount, checkAllAfterExercise, checkFirstLogin } from './service.js';

const router = Router();

// 事件订阅：练习完成 → 检查 streak_7 / exercises_100 / perfect_streak_10 / xp_500
eventBus.on(EventType.EXERCISE_COMPLETED, (payload) => {
  checkAllAfterExercise(payload as ExerciseCompletedPayload).catch((err) => {
    console.error('[achievement] checkAllAfterExercise 处理失败：', err);
  });
});

// 事件订阅：用户注册 → 授予首登勋章
eventBus.on(EventType.USER_REGISTERED, (payload) => {
  const { userId } = payload as { userId: string };
  checkFirstLogin(userId).catch((err) => {
    console.error('[achievement] checkFirstLogin 处理失败：', err);
  });
});

function readUserId(req: object): string | null {
  const u = (req as AuthenticatedRequest).userId;
  return typeof u === 'string' && u.length > 0 ? u : null;
}

/** GET /achievements — 全部勋章（含 unlocked 状态） */
router.get('/', authMiddleware, async (req, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const list = await getUserAchievements(userId);
    res.json({ code: 0, message: '成功', data: list } satisfies ApiResponse);
  } catch (err) {
    console.error('[achievement] 获取勋章列表失败：', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null } satisfies ApiResponse);
  }
});

/** GET /achievements/count — 已解锁勋章数（给 Dashboard 用） */
router.get('/count', authMiddleware, async (req, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const count = await getUnlockedCount(userId);
    res.json({
      code: 0,
      message: '成功',
      data: { count, total: 5 },
    } satisfies ApiResponse);
  } catch (err) {
    console.error('[achievement] 获取勋章数失败：', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null } satisfies ApiResponse);
  }
});

export default router;
