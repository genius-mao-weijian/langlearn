/**
 * 进度追踪模块路由（progress）
 *
 * 限界上下文：Progress & Achievement
 * 职责：学习进度概览、课程详细进度查询、进度记录
 *
 * 【数据更新机制】
 * 进度数据不由用户直接写入，而是由 learning 模块在练习完成时
 * 发布 EXERCISE_COMPLETED 事件，progress 模块订阅该事件后异步更新进度。
 * 这种事件驱动的解耦设计保证了 learning 模块无需感知 progress 的存在，
 * 二者仅通过事件总线协作。
 */
import { Router, Request, Response, RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../shared/types.js';

const router = Router();

/**
 * JWT 鉴权中间件（占位）
 * 与 identity 模块共用同一套 JWT 校验逻辑，后续将抽取到 shared 层统一实现。
 */
const authMiddleware: RequestHandler = (_req, _res, next) => {
  // TODO: 实现 JWT 校验逻辑，校验通过后将 userId 挂载到 req 上
  next();
};

/**
 * GET / - 获取当前用户学习进度概览
 * 需鉴权
 * 返回：各语言 / 等级的学习时长、完成率、连续打卡天数等
 */
router.get('/', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId ?? null;
  res.status(501).json({
    code: 501,
    message: '获取学习进度概览接口尚未实现（P0 占位）',
    data: { userId },
  });
});

/**
 * GET /detail/:courseId - 获取某课程的详细进度
 * 需鉴权
 * 路径参数：courseId - 课程 ID
 * 返回：该课程下各课时的完成状态、正确率、最近学习时间
 */
router.get('/detail/:courseId', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId ?? null;
  res.status(501).json({
    code: 501,
    message: '获取课程详细进度接口尚未实现（P0 占位）',
    data: { userId, courseId: req.params.courseId },
  });
});

/**
 * POST / - 记录学习进度（内部接口）
 * 该接口主要由事件总线触发的处理器调用，非面向终端用户。
 * 当 learning 模块发出 EXERCISE_COMPLETED 事件时，
 * progress 模块的事件处理器会调用此逻辑更新进度。
 *
 * 后续实现逻辑：写入 / 更新进度表，必要时发布 PROGRESS_UPDATED 事件
 */
router.post('/', (req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '记录学习进度接口尚未实现（P0 占位）',
    data: { body: req.body },
  });
});

export default router;
