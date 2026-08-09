/**
 * Redis 客户端
 * 用于会话缓存、refresh token 存储等。
 * P0 阶段主要用于存储 refresh token。
 */
import { createClient, type RedisClientType } from 'redis';
import { env } from '../../config/env.js';

export const redis: RedisClientType = createClient({
  url: env.REDIS_URL,
});

redis.on('error', (err) => {
  console.error('[redis] 连接错误:', err.message);
});

// 连接 Redis（异步执行，不阻塞应用启动）
redis.connect().then(() => {
  console.log('[redis] 连接成功');
}).catch((err) => {
  console.error('[redis] 连接失败:', err.message);
});
