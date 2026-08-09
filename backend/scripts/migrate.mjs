/**
 * 数据库迁移脚本
 * 执行 migrations 目录下的 SQL 文件
 * 运行方式：node scripts/migrate.mjs
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 确保 migrations 目录存在
  if (!fs.existsSync(migrationsDir)) {
    console.log('migrations 目录不存在，跳过');
    await pool.end();
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    console.log(`[migrate] 执行 ${file} ...`);
    await pool.query(sql);
    console.log(`[migrate] ${file} 完成`);
  }

  // 列出所有表
  const res = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  );
  console.log('\n当前表列表:');
  for (const row of res.rows) {
    console.log('  -', row.tablename);
  }

  await pool.end();
  console.log('\n迁移完成');
}

migrate().catch((err) => {
  console.error('迁移失败:', err.message);
  process.exit(1);
});
