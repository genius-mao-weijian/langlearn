/**
 * 身份认证模块路由（identity）
 *
 * 限界上下文：Identity & Access
 * 职责：用户注册、登录、token 刷新、当前用户信息查询
 *
 * P0 阶段仅定义路由结构与占位响应，具体逻辑（密码哈希、JWT 签发等）
 * 将在后续阶段实现。
 */
import { Router, Request, Response, RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../shared/types.js';

const router = Router();

/**
 * JWT 鉴权中间件（占位）
 * P0 阶段不实现真实校验，仅作为接口预留。
 * 后续将：解析 Authorization 头 -> 验证 JWT -> 注入 userId 到 req
 */
const authMiddleware: RequestHandler = (_req, _res, next) => {
  // TODO: 实现 JWT 校验逻辑，校验通过后将 userId 挂载到 req 上
  next();
};

/**
 * POST /register - 用户注册
 * 请求体：{ email, password, nickname }
 * 后续实现逻辑：
 *   1. zod 校验请求体
 *   2. 检查邮箱是否已注册
 *   3. bcrypt 哈希密码后写入数据库
 *   4. 发布 USER_REGISTERED 事件
 *   5. 返回用户信息（含 access token）
 */
router.post('/register', (_req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '注册接口尚未实现（P0 占位）',
    data: null,
  });
});

/**
 * POST /login - 用户登录
 * 请求体：{ email, password }
 * 后续实现逻辑：
 *   1. 根据邮箱查询用户
 *   2. bcrypt 比对密码
 *   3. 签发 access token 与 refresh token
 *   4. 返回 token
 */
router.post('/login', (_req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '登录接口尚未实现（P0 占位）',
    data: null,
  });
});

/**
 * GET /me - 获取当前登录用户信息
 * 需携带 Authorization: Bearer <token>
 * 后续实现逻辑：从 req.userId 查询用户详情并返回
 */
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  // P0 占位：req.userId 将由 authMiddleware 注入（AuthenticatedRequest）
  const userId = (req as AuthenticatedRequest).userId ?? null;
  res.status(501).json({
    code: 501,
    message: '获取用户信息接口尚未实现（P0 占位）',
    data: { userId },
  });
});

/**
 * POST /refresh - 刷新 access token
 * 请求体：{ refreshToken }
 * 后续实现逻辑：校验 refresh token 合法性后签发新的 access token
 */
router.post('/refresh', (_req: Request, res: Response) => {
  res.status(501).json({
    code: 501,
    message: '刷新 token 接口尚未实现（P0 占位）',
    data: null,
  });
});

export default router;
