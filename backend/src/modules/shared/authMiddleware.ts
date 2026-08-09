/**
 * 统一 JWT 鉴权中间件
 *
 * 从 Authorization 头提取 Bearer token，校验后将 userId 注入到 req 对象。
 * 所有需要登录的接口都应使用此中间件。
 *
 * 用法：router.get('/profile', authMiddleware, handler)
 */
import { type RequestHandler } from 'express';
import { verifyAccessToken } from './jwt.js';
import type { AuthenticatedRequest, UserId } from './types.js';

export const authMiddleware: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 401,
      message: '未提供认证令牌',
      data: null,
    });
    return;
  }

  const token = authHeader.slice(7); // 去掉 "Bearer " 前缀
  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({
      code: 401,
      message: '认证令牌无效或已过期',
      data: null,
    });
    return;
  }

  // 将 userId 注入到 req 对象（ branded type 需要显式断言）
  (req as AuthenticatedRequest).userId = payload.userId as UserId;
  next();
};
