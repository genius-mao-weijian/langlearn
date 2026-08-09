/**
 * Identity & Access 路由（v2 适配前端落地 DTO）
 *  - registerSchema: nickname 可选
 *  - /me 返回 { user } 包装
 *  - /logout 支持 refreshToken 吊销
 * 统一响应：{ code: 0, message: '成功', data: T }
 */
import { Router, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../shared/authMiddleware.js';
import type { AuthenticatedRequest, ApiResponse } from '../shared/types.js';
import {
  registerUser,
  loginUser,
  getUserById,
  refreshTokens,
  logoutByRefresh,
} from './service.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
  // nickname 可选，service 层会 fallback 邮箱前缀
  nickname: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空'),
});

function extractFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path.join('.') || '_';
    if (!errors[field]) errors[field] = issue.message;
  }
  return errors;
}

function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/** POST /register */
router.post('/register', async (req, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: 400,
        message: '请求参数校验失败',
        data: { errors: extractFieldErrors(parsed.error.issues) },
      } satisfies ApiResponse);
      return;
    }
    const { email, password, nickname } = parsed.data;
    const user = await registerUser(email, password, nickname);
    res.json({ code: 0, message: '成功', data: user } satisfies ApiResponse);
  } catch (err) {
    if (getErrorCode(err) === 'EMAIL_ALREADY_EXISTS') {
      res.status(409).json({
        code: 409,
        message: '邮箱已被注册',
        data: null,
      } satisfies ApiResponse);
      return;
    }
    console.error('[identity] 注册失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/** POST /login */
router.post('/login', async (req, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: 400,
        message: '请求参数校验失败',
        data: { errors: extractFieldErrors(parsed.error.issues) },
      } satisfies ApiResponse);
      return;
    }
    const { email, password } = parsed.data;
    const result = await loginUser(email, password);
    res.json({ code: 0, message: '成功', data: result } satisfies ApiResponse);
  } catch (err) {
    if (getErrorCode(err) === 'INVALID_CREDENTIALS') {
      res.status(401).json({
        code: 401,
        message: '邮箱或密码错误',
        data: null,
      } satisfies ApiResponse);
      return;
    }
    console.error('[identity] 登录失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/** GET /me — { user } 包装，对齐前端 `{ user: User }` */
router.get('/me', authMiddleware, async (req, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      res.status(401).json({ code: 401, message: '未登录', data: null } satisfies ApiResponse);
      return;
    }
    const user = await getUserById(userId);
    if (!user) {
      res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      } satisfies ApiResponse);
      return;
    }
    res.json({ code: 0, message: '成功', data: { user } } satisfies ApiResponse);
  } catch (err) {
    console.error('[identity] 获取用户信息失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/** POST /refresh */
router.post('/refresh', async (req, res: Response) => {
  try {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: 400,
        message: '请求参数校验失败',
        data: { errors: extractFieldErrors(parsed.error.issues) },
      } satisfies ApiResponse);
      return;
    }
    const result = await refreshTokens(parsed.data.refreshToken);
    res.json({ code: 0, message: '成功', data: result } satisfies ApiResponse);
  } catch (err) {
    if (getErrorCode(err) === 'INVALID_REFRESH_TOKEN') {
      res.status(401).json({
        code: 401,
        message: 'refresh token 无效或已过期',
        data: null,
      } satisfies ApiResponse);
      return;
    }
    console.error('[identity] 刷新 token 失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/** POST /logout */
const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});
router.post('/logout', async (req, res: Response) => {
  try {
    const parsed = logoutSchema.safeParse(req.body);
    if (parsed.success && parsed.data.refreshToken) {
      await logoutByRefresh(parsed.data.refreshToken);
    }
    res.json({
      code: 0,
      message: '成功',
      data: { success: true as const },
    } satisfies ApiResponse);
  } catch (err) {
    console.error('[identity] 登出失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

export default router;
