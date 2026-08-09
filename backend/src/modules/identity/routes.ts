/**
 * 身份认证模块路由（identity）
 *
 * 限界上下文：Identity & Access
 * 职责：用户注册、登录、token 刷新、当前用户信息查询
 *
 * 路由层只做：参数校验（zod）、调用 service、组装统一响应；
 * 业务逻辑（密码哈希、JWT 签发、数据库读写）全部在 service.ts 中实现。
 *
 * 统一响应格式：{ code: 0, message: '成功', data: T }
 * 错误时 code 非 0，并设置对应 HTTP 状态码。
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
} from './service.js';

const router = Router();

// ===== 请求体校验 Schema =====

// 注册请求体：邮箱格式、密码至少 6 位、昵称非空
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 位'),
  nickname: z.string().min(1, '昵称不能为空'),
});

// 登录请求体：邮箱格式、密码非空
const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

// 刷新 token 请求体：refreshToken 非空
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空'),
});

/**
 * 从 zod 校验结果中提取字段错误信息，用于 400 响应的 details 字段。
 * 返回形如 { email: '邮箱格式不正确', password: '密码至少 6 位' } 的对象。
 */
function extractFieldErrors(
  issues: z.ZodIssue[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path.join('.') || '_';
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/**
 * 从 catch 的 unknown 错误中安全读取业务错误 code。
 */
function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

// ===== 路由定义 =====

/**
 * POST /register - 用户注册
 * 请求体：{ email, password, nickname }
 */
router.post('/register', async (req, res: Response) => {
  try {
    // 1. zod 校验请求体
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: 400,
        message: '请求参数校验失败',
        data: { errors: extractFieldErrors(parsed.error.issues) },
      } satisfies ApiResponse);
      return;
    }

    // 2. 调用 service 注册用户
    const { email, password, nickname } = parsed.data;
    const user = await registerUser(email, password, nickname);

    res.json({ code: 0, message: '成功', data: user } satisfies ApiResponse);
  } catch (err) {
    // 邮箱已注册 -> 409
    if (getErrorCode(err) === 'EMAIL_ALREADY_EXISTS') {
      res.status(409).json({
        code: 409,
        message: '邮箱已被注册',
        data: null,
      } satisfies ApiResponse);
      return;
    }
    // 其他未知错误 -> 500
    console.error('[identity] 注册失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/**
 * POST /login - 用户登录
 * 请求体：{ email, password }
 */
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
    // 邮箱或密码错误 -> 401
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

/**
 * GET /me - 获取当前登录用户信息
 * 需鉴权：authMiddleware 解析 token 并注入 req.userId
 */
router.get('/me', authMiddleware, async (req, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    // authMiddleware 已保证 userId 存在，此处做防御性判断
    if (!userId) {
      res.status(401).json({
        code: 401,
        message: '未登录',
        data: null,
      } satisfies ApiResponse);
      return;
    }

    const user = await getUserById(userId);
    if (!user) {
      // token 有效但用户已被删除
      res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null,
      } satisfies ApiResponse);
      return;
    }

    res.json({ code: 0, message: '成功', data: user } satisfies ApiResponse);
  } catch (err) {
    console.error('[identity] 获取用户信息失败：', err);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null,
    } satisfies ApiResponse);
  }
});

/**
 * POST /refresh - 刷新 access token
 * 请求体：{ refreshToken }
 */
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
    // refresh token 无效 -> 401
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

export default router;
