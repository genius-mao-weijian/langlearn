/**
 * 数据库初始化脚本（临时）
 * 1. 连接到 PostgreSQL 的默认 postgres 数据库
 * 2. 创建 langlearn 数据库（如不存在）
 * 3. 验证 Redis 连接
 *
 * 运行方式：node scripts/init-db.mjs
 */
import pg from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function initDatabase() {
  // 解析 DATABASE_URL，替换数据库名为 postgres 用于初始连接
  const dbUrl = process.env.DATABASE_URL;
  const adminUrl = dbUrl.replace(/\/[^/]*$/, '/postgres');

  console.log('[1/3] 连接 PostgreSQL（postgres 库）...');
  const adminPool = new Pool({ connectionString: adminUrl });

  try {
    // 检查 langlearn 数据库是否已存在
    const res = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'langlearn'"
    );

    if (res.rows.length > 0) {
      console.log('[1/3] langlearn 数据库已存在，跳过创建');
    } else {
      await adminPool.query('CREATE DATABASE langlearn');
      console.log('[1/3] langlearn 数据库创建成功');
    }
  } finally {
    await adminPool.end();
  }

  // 验证 langlearn 数据库连接
  console.log('[2/3] 验证 langlearn 数据库连接...');
  const pool = new Pool({ connectionString: dbUrl });
  try {
    const res = await pool.query('SELECT version()');
    console.log('[2/3] langlearn 连接成功:', res.rows[0].version.split(',')[0]);
  } finally {
    await pool.end();
  }

  // 验证 Redis 连接
  console.log('[3/3] 验证 Redis 连接...');
  const redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', (err) => console.error('Redis 错误:', err));
  await redis.connect();
  const pong = await redis.ping();
  console.log('[3/3] Redis 连接成功:', pong);
  await redis.disconnect();

  console.log('\n所有连接验证通过');
}

initDatabase().catch((err) => {
  console.error('初始化失败:', err.message);
  process.exit(1);
});
