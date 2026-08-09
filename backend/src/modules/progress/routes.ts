/**
 * 进度追踪模块路由（progress）
 *
 * 限界上下文：Progress & Achievement
 * 职责：学习进度概览、课程详细进度查询
 *
 * 【数据更新机制】
 * 进度数据不由用户直接通过 HTTP 写入，而是由 learning 模块在练习完成时
 * 发布 EXERCISE_COMPLETED 事件，本模块订阅该事件后异步更新进度。
 * 因此本模块仅暴露 GET 查询接口，不提供 POST 写入接口（事件驱动解耦）。
 *
 * 统一响应格式：{ code: 0, message: '成功', data: T }
 */
import { Router, Response } from 'express';
import { authMiddleware } from '../shared/authMiddleware.js';
import { eventBus, EventType } from '../shared/eventBus.js';
import type { AuthenticatedRequest, ApiResponse, ExerciseCompletedPayload } from '../shared/types.js';
import {
  getProgressOverview,
  getCourseProgress,
  recordProgress,
} from './service.js';

const router = Router();

// ===== 事件订阅：监听练习完成事件，异步更新学习进度 =====
// 在模块加载时注册订阅，app.ts 导入本模块即触发注册。
// eventBus 通过 setImmediate 异步执行处理器，且内部已 try/catch，
// 此处再包一层 Promise.catch 防止 recordProgress 的异步拒绝逃逸为 unhandledRejection。
eventBus.on(EventType.EXERCISE_COMPLETED, (payload) => {
  recordProgress(payload as ExerciseCompletedPayload).catch((err) => {
    console.error('[progress] recordProgress 处理失败：', err);
  });
});

/**
 * GET / - 获取当前用户学习进度概览
 * 需鉴权
 * 返回该用户所有已学习课程的进度列表（含完成率、正确数等）。
 */
router.get('/', authMiddleware, async (req, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '未登录',
        data: null,
      } satisfies ApiResponse);
      return;
    }

    const overview = await getProgressOverview(userId);

    res.json({
      code: 0,
      message: '成功',
      data: overview,
    } satisfies ApiResponse);
  } catch (err) {
    console.error('[progress] 获取进度概览失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/**
 * GET /detail/:courseId - 获取某课程的详细进度
 * 需鉴权
 * 路径参数：courseId - 课程 ID
 */
router.get('/detail/:courseId', authMiddleware, async (req, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '未登录',
        data: null,
      } satisfies ApiResponse);
      return;
    }

    const detail = await getCourseProgress(userId, req.params.courseId);

    // 无进度记录 -> 404（用户尚未学习该课程）
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
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

export default router;
