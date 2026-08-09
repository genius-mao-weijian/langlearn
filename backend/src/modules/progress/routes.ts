/**
 * 进度追踪模块路由（v2 适配前端落地 DTO）
 * 新增：
 *  - GET /stats  用户统计（总题/总XP/连击/时长）
 *  - GET /byLevel 分等级进度
 *  - GET /dashboard 仪表盘聚合（user + stats + byLevel + recent）
 *  - GET /recent 最近答题记录
 */
import { Router, Response } from 'express';
import { authMiddleware } from '../shared/authMiddleware.js';
import { eventBus, EventType } from '../shared/eventBus.js';
import type { AuthenticatedRequest, ApiResponse, ExerciseCompletedPayload, UserDTO } from '../shared/types.js';
import {
  getProgressOverview,
  getCourseProgress,
  recordProgress,
  getUserStats,
  getProgressByLevel,
  getRecentAttempts,
  getDashboard,
} from './service.js';
import { getUserById } from '../identity/service.js';

const router = Router();

eventBus.on(EventType.EXERCISE_COMPLETED, (payload) => {
  recordProgress(payload as ExerciseCompletedPayload).catch((err) => {
    console.error('[progress] recordProgress 处理失败：', err);
  });
});

/** 读取 userId，缺失返回 401 */
function readUserId(req: object): string | null {
  const u = (req as AuthenticatedRequest).userId;
  return typeof u === 'string' && u.length > 0 ? u : null;
}

/** GET /dashboard — 仪表盘聚合单接口 */
router.get('/dashboard', authMiddleware, async (req, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({ code: 404, message: '用户不存在', data: null } satisfies ApiResponse);
      return;
    }
    const dashboard = await getDashboard(userId, user as UserDTO);
    res.json({ code: 0, message: '成功', data: dashboard } satisfies ApiResponse);
  } catch (err) {
    console.error('[progress] 获取 dashboard 失败：', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null } satisfies ApiResponse);
  }
});

/** GET /stats — 用户统计聚合 */
router.get('/stats', authMiddleware, async (req, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const stats = await getUserStats(userId);
    res.json({ code: 0, message: '成功', data: stats } satisfies ApiResponse);
  } catch (err) {
    console.error('[progress] 获取 stats 失败：', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null } satisfies ApiResponse);
  }
});

/** GET /byLevel — 分等级进度 */
router.get('/byLevel', authMiddleware, async (req, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const list = await getProgressByLevel(userId);
    res.json({ code: 0, message: '成功', data: list } satisfies ApiResponse);
  } catch (err) {
    console.error('[progress] 获取 byLevel 失败：', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null } satisfies ApiResponse);
  }
});

/** GET /recent — 最近答题记录（默认 10 条） */
router.get('/recent', authMiddleware, async (req, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const limit = Math.min(Number((req.query as { limit?: unknown }).limit) || 10, 100);
    const list = await getRecentAttempts(userId, limit);
    res.json({ code: 0, message: '成功', data: list } satisfies ApiResponse);
  } catch (err) {
    console.error('[progress] 获取 recent 失败：', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null } satisfies ApiResponse);
  }
});

/** GET / — 所有课程进度概览 */
router.get('/', authMiddleware, async (req, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const overview = await getProgressOverview(userId);
    res.json({ code: 0, message: '成功', data: overview } satisfies ApiResponse);
  } catch (err) {
    console.error('[progress] 获取进度概览失败：', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null } satisfies ApiResponse);
  }
});

/** GET /detail/:courseId — 单课程进度 */
router.get('/detail/:courseId', authMiddleware, async (req, res: Response) => {
  try {
    const userId = readUserId(req);
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const detail = await getCourseProgress(userId, req.params.courseId);
    if (!detail) {
      res.status(404).json({
        code: 404,
        message: '暂无该课程的学习进度',
        data: null,
      } satisfies ApiResponse);
      return;
    }
    res.json({ code: 0, message: '成功', data: detail } satisfies ApiResponse);
  } catch (err) {
    console.error('[progress] 获取课程详细进度失败：', err);
    res.status(500).json({ code: 500, message: '服务器内部错误', data: null } satisfies ApiResponse);
  }
});

export default router;
