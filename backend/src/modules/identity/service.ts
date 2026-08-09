/**
 * Identity Service — 适配 P0 前端 DTO：
 *  - user: nativeLanguage/targetLanguage/level
 *  - auth response: tokenType: 'Bearer' + expiresIn(秒)
 *  - nickname 注册时可选（空则使用邮箱前缀）
 */
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../shared/db.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from '../shared/jwt.js';
import type { UserDTO, AuthResponseDTO } from '../shared/types.js';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  nickname: string;
  native_language: string | null;
  target_language: string | null;
  target_level: string | null;
  created_at: string;
}

function mapToUserDTO(row: UserRow): UserDTO {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    nativeLanguage: row.native_language,
    targetLanguage: row.target_language,
    level: row.target_level,
    createdAt: row.created_at,
  };
}

// Access token 固定 TTL（秒），同步 jwt.ts 中的 '15m'
const ACCESS_TTL_SECONDS = 15 * 60;

function emailToNickname(email: string): string {
  const at = email.indexOf('@');
  const name = at > 0 ? email.slice(0, at) : email;
  return name.slice(0, 32);
}

export async function registerUser(
  email: string,
  password: string,
  nickname?: string
): Promise<AuthResponseDTO> {
  const existing = await queryOne<Pick<UserRow, 'id'>>(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );
  if (existing) {
    throw Object.assign(new Error('邮箱已被注册'), {
      code: 'EMAIL_ALREADY_EXISTS',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const finalNickname = (nickname && nickname.trim()) || emailToNickname(email);

  // 首次注册时默认目标语言 en、等级 A1，便于仪表盘默认值
  const row = await queryOne<UserRow>(
    `INSERT INTO users (email, password_hash, nickname, target_language, target_level)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, password_hash, nickname, native_language, target_language,
               target_level, created_at`,
    [email, passwordHash, finalNickname, 'en', 'A1'],
  );
  if (!row) throw new Error('用户写入失败');

  const user = mapToUserDTO(row);
  const accessToken = signAccessToken(row.id, row.email);
  const refreshToken = await signRefreshToken(row.id);

  return {
    user,
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TTL_SECONDS,
  };
}

export async function loginUser(
  email: string,
  password: string,
): Promise<AuthResponseDTO> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, password_hash, nickname, native_language, target_language,
            target_level, created_at
     FROM users WHERE email = $1`,
    [email],
  );
  if (!row) {
    throw Object.assign(new Error('邮箱或密码错误'), { code: 'INVALID_CREDENTIALS' });
  }
  const isMatch = await bcrypt.compare(password, row.password_hash);
  if (!isMatch) {
    throw Object.assign(new Error('邮箱或密码错误'), { code: 'INVALID_CREDENTIALS' });
  }
  const user = mapToUserDTO(row);
  const accessToken = signAccessToken(row.id, row.email);
  const refreshToken = await signRefreshToken(row.id);
  return {
    user,
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TTL_SECONDS,
  };
}

export async function getUserById(userId: string): Promise<UserDTO | null> {
  const row = await queryOne<UserRow>(
    `SELECT id, email, nickname, native_language, target_language,
            target_level, created_at
     FROM users WHERE id = $1`,
    [userId],
  );
  return row ? mapToUserDTO(row) : null;
}

export async function refreshTokens(
  refreshToken: string,
): Promise<AuthResponseDTO> {
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    throw Object.assign(new Error('refresh token 无效或已过期'), {
      code: 'INVALID_REFRESH_TOKEN',
    });
  }
  await revokeRefreshToken(refreshToken);
  const row = await queryOne<UserRow>(
    `SELECT id, email, nickname, native_language, target_language,
            target_level, created_at
     FROM users WHERE id = $1`,
    [payload.userId],
  );
  if (!row) {
    throw Object.assign(new Error('用户不存在'), { code: 'USER_NOT_FOUND' });
  }
  const user = mapToUserDTO(row);
  const accessToken = signAccessToken(row.id, row.email);
  const newRefreshToken = await signRefreshToken(row.id);
  return {
    user,
    accessToken,
    refreshToken: newRefreshToken,
    tokenType: 'Bearer',
    expiresIn: ACCESS_TTL_SECONDS,
  };
}

export async function logoutByRefresh(refreshToken: string): Promise<void> {
  await revokeRefreshToken(refreshToken);
}
