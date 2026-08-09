/**
 * PostgreSQL 连接池
 * 使用 pg 模块的 Pool 管理数据库连接，全应用共享一个池实例。
 * 所有模块通过此模块获取数据库连接，禁止直接 new Pool。
 */
import { Pool } from 'pg';
import { env } from '../../config/env.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // 连接池大小：开发环境 5 个连接足够
  max: 5,
  // 空闲连接超时 30 秒
  idleTimeoutMillis: 30000,
  // 连接超时 2 秒
  connectionTimeoutMillis: 2000,
});

// 导出查询辅助函数，方便模块使用
// 用法：const rows = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
export async function query<T extends Record<string, any>>(
  text: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

// 导出单行查询辅助函数
// 用法：const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
export async function queryOne<T extends Record<string, any>>(
  text: string,
  params?: (string | number | boolean | null)[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}
