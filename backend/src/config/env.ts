/**
 * 环境变量配置模块
 *
 * 使用 zod 定义环境变量的 schema 并在启动时进行校验：
 * - 类型安全：通过 zod 推断出 env 对象的 TypeScript 类型，编译期即可发现拼写错误
 * - 快速失败：缺失或非法的环境变量会在进程启动时立即抛错，避免运行时隐患
 *
 * 规范：所有需要访问环境变量的代码都应统一从此模块导入 env 对象，
 * 禁止在业务代码中直接调用 process.env，以保证可测试性与可维护性。
 */
// 在模块最顶部加载 dotenv，利用 ESM 同模块内 import 先于其他代码执行的特性，
// 确保在执行下方 zod 校验时 .env 文件中的变量已经注入 process.env。
// 相比在 app.ts 中调用 dotenv.config()，这种写法避免了因模块间 import 提升导致的执行顺序问题。
import 'dotenv/config';
import { z } from 'zod';

/**
 * 环境变量 schema 定义
 * 每个字段附有描述与校验规则，便于维护和错误定位
 */
const envSchema = z.object({
  // 服务监听端口，默认 3000
  PORT: z
    .string()
    .default('3000')
    .transform(Number)
    .refine((port) => port > 0 && port < 65536, {
      message: 'PORT 必须是 0-65535 之间的有效端口',
    }),

  // JWT 签名密钥，生产环境必须替换为高强度随机串
  JWT_SECRET: z.string().min(16, { message: 'JWT_SECRET 至少 16 个字符' }),

  // PostgreSQL 连接字符串
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL 必须是合法的 URL' }),

  // Redis 连接字符串
  REDIS_URL: z.string().url({ message: 'REDIS_URL 必须是合法的 URL' }),

  // 允许的前端来源（CORS）
  CLIENT_ORIGIN: z.string().url({ message: 'CLIENT_ORIGIN 必须是合法的 URL' }),
});

// 解析并校验环境变量
// 若校验失败，zod 抛出 ZodError，此处打印字段级错误后退出进程
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[env] 环境变量校验失败：');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

// 导出类型安全的环境变量对象，全应用共享
export const env = parsed.data;

// 导出类型，供其他模块按需引用
export type Env = z.infer<typeof envSchema>;
