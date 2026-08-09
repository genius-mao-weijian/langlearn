/**
 * 身份认证模块业务逻辑（identity service）
 *
 * 职责：用户注册、登录、用户信息查询、token 刷新的具体实现。
 * 本层负责：数据库读写、密码哈希与比对、JWT 签发与校验，
 * 并将数据库 snake_case 列名映射为对外的 camelCase DTO。
 *
 * 路由层（routes.ts）只做参数校验与响应组装，业务逻辑全部下沉到此处。
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

/**
 * users 表的数据库行类型（snake_case 列名，含密码哈希）
 * 仅在本模块内部使用，不对外暴露 password_hash。
 */
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
}

/**
 * 将数据库行映射为 UserDTO（snake_case -> camelCase）
 * 刻意忽略 password_hash，避免密码相关信息外泄。
 */
function mapToUserDTO(row: UserRow): UserDTO {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

/**
 * 注册新用户
 * 流程：检查邮箱是否已存在 -> bcrypt 哈希密码 -> 插入 users 表 -> 返回 UserDTO
 *
 * @param email    用户邮箱
 * @param password 明文密码（service 层负责哈希，不存明文）
 * @param nickname 用户昵称
 * @returns 新创建的用户信息（不含密码）
 * @throws {Error} code='EMAIL_ALREADY_EXISTS' 邮箱已被注册
 */
export async function registerUser(
  email: string,
  password: string,
  nickname: string
): Promise<AuthResponseDTO> {
  // 1. 检查邮箱是否已注册（避免唯一约束冲突，提前给出友好错误）
  const existing = await queryOne<Pick<UserRow, 'id'>>(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existing) {
    // 通过 code 属性标记业务错误类型，便于路由层区分状态码
    throw Object.assign(new Error('邮箱已被注册'), {
      code: 'EMAIL_ALREADY_EXISTS',
    });
  }

  // 2. 使用 bcrypt 哈希密码，盐值轮数为 10（性能与安全性的平衡）
  const passwordHash = await bcrypt.hash(password, 10);

  // 3. 插入新用户并 RETURNING * 拿到完整行（含数据库生成的 id、created_at）
  const row = await queryOne<UserRow>(
    `INSERT INTO users (email, password_hash, nickname)
     VALUES ($1, $2, $3)
     RETURNING id, email, nickname, avatar_url, created_at`,
    [email, passwordHash, nickname]
  );
  if (!row) {
    // 理论上不会走到这里，RETURNING 必返回插入的行；做防御性处理
    throw new Error('用户写入失败');
  }

  // 4. 注册成功后直接签发 token，免去用户再次登录的步骤
  const user = mapToUserDTO(row);
  const accessToken = signAccessToken(row.id, row.email);
  const refreshToken = await signRefreshToken(row.id);

  return { user, accessToken, refreshToken };
}

/**
 * 用户登录
 * 流程：按邮箱查询用户 -> bcrypt 比对密码 -> 签发 access + refresh token
 *
 * 注意：邮箱不存在与密码错误返回相同的业务错误码，
 * 避免攻击者通过错误信息枚举已注册邮箱。
 *
 * @param email    用户邮箱
 * @param password 明文密码
 * @returns 登录响应（用户信息 + 双 token）
 * @throws {Error} code='INVALID_CREDENTIALS' 邮箱或密码错误
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponseDTO> {
  // 1. 根据邮箱查询用户（需拿到 password_hash 用于比对）
  const row = await queryOne<UserRow>(
    'SELECT id, email, password_hash, nickname, avatar_url, created_at FROM users WHERE email = $1',
    [email]
  );
  if (!row) {
    throw Object.assign(new Error('邮箱或密码错误'), {
      code: 'INVALID_CREDENTIALS',
    });
  }

  // 2. bcrypt 比对明文密码与数据库中的哈希值
  const isMatch = await bcrypt.compare(password, row.password_hash);
  if (!isMatch) {
    throw Object.assign(new Error('邮箱或密码错误'), {
      code: 'INVALID_CREDENTIALS',
    });
  }

  // 3. 签发 access token（短期，15min）与 refresh token（长期，7d，存 Redis）
  const user = mapToUserDTO(row);
  const accessToken = signAccessToken(row.id, row.email);
  const refreshToken = await signRefreshToken(row.id);

  return { user, accessToken, refreshToken };
}

/**
 * 根据 ID 查询用户信息
 * @param userId 用户 ID
 * @returns UserDTO 或 null（用户不存在）
 */
export async function getUserById(userId: string): Promise<UserDTO | null> {
  const row = await queryOne<UserRow>(
    'SELECT id, email, nickname, avatar_url, created_at FROM users WHERE id = $1',
    [userId]
  );
  return row ? mapToUserDTO(row) : null;
}

/**
 * 刷新 token
 * 流程：验证 refresh token -> 撤销旧 token -> 签发新的 access + refresh token
 *
 * 采用「一次性 refresh token」策略：每次刷新后旧 refresh token 立即失效，
 * 降低 token 被盗用后的风险（refresh token 轮换）。
 *
 * @param refreshToken 客户端持有的 refresh token
 * @returns 新的登录响应（用户信息 + 新双 token）
 * @throws {Error} code='INVALID_REFRESH_TOKEN' refresh token 无效或已过期
 */
export async function refreshTokens(
  refreshToken: string
): Promise<AuthResponseDTO> {
  // 1. 验证 refresh token 合法性（签名正确 + Redis 中仍存在）
  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) {
    throw Object.assign(new Error('refresh token 无效或已过期'), {
      code: 'INVALID_REFRESH_TOKEN',
    });
  }

  // 2. 撤销旧 refresh token，使其无法再次使用（轮换）
  await revokeRefreshToken(refreshToken);

  // 3. 查询用户最新信息（确保用户仍存在，且拿到最新 email 用于签发）
  const row = await queryOne<UserRow>(
    'SELECT id, email, nickname, avatar_url, created_at FROM users WHERE id = $1',
    [payload.userId]
  );
  if (!row) {
    throw Object.assign(new Error('用户不存在'), { code: 'USER_NOT_FOUND' });
  }

  // 4. 签发新的 access + refresh token
  const user = mapToUserDTO(row);
  const newAccessToken = signAccessToken(row.id, row.email);
  const newRefreshToken = await signRefreshToken(row.id);

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
}
