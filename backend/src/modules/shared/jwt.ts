/**
 * JWT 签发与校验工具
 *
 * P0 使用无状态 JWT：
 * - access token：有效期 15 分钟，放在 Authorization 头中
 * - refresh token：有效期 7 天，存储在 Redis 中（key: refresh_token:{tokenId}）
 *
 * 后续可扩展为 Redis 黑名单模式以支持主动登出。
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { redis } from './redis.js';
import type { UserId } from './types.js';

// Access token 载荷
export interface AccessTokenPayload {
  userId: string;
  email: string;
  type: 'access';
}

// Refresh token 载荷
export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  type: 'refresh';
}

// Access token 有效期 15 分钟
const ACCESS_TOKEN_EXPIRES_IN = '15m';
// Refresh token 有效期 7 天
const REFRESH_TOKEN_EXPIRES_IN = '7d';
// Refresh token 在 Redis 中的 key 前缀
const REFRESH_TOKEN_KEY_PREFIX = 'refresh_token:';

/**
 * 签发 access token
 */
export function signAccessToken(userId: string, email: string): string {
  const payload: AccessTokenPayload = { userId, email, type: 'access' };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * 签发 refresh token 并存入 Redis
 * @param userId 用户 ID
 * @returns refreshToken 字符串
 */
export async function signRefreshToken(userId: string): Promise<string> {
  const tokenId = crypto.randomUUID();
  const payload: RefreshTokenPayload = { userId, tokenId, type: 'refresh' };
  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });

  // 存入 Redis，7 天过期
  const key = REFRESH_TOKEN_KEY_PREFIX + tokenId;
  // 注意：redis 模块的 setEx 方法接受秒数
  await redis.set(key, userId, { EX: 7 * 24 * 60 * 60 });

  return token;
}

/**
 * 验证 access token
 * @returns 解码后的载荷，或 null（校验失败）
 */
export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    if (decoded.type !== 'access') return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 验证 refresh token 并检查 Redis 中是否存在
 * @returns 解码后的载荷，或 null（校验失败）
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload;
    if (decoded.type !== 'refresh') return null;

    // 检查 Redis 中是否存在该 token
    const key = REFRESH_TOKEN_KEY_PREFIX + decoded.tokenId;
    const stored = await redis.get(key);
    if (!stored || stored !== decoded.userId) return null;

    return decoded;
  } catch {
    return null;
  }
}

/**
 * 撤销 refresh token（登出时调用）
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload;
    const key = REFRESH_TOKEN_KEY_PREFIX + decoded.tokenId;
    await redis.del(key);
  } catch {
    // token 无效，无需撤销
  }
}
