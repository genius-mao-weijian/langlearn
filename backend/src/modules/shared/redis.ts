/**
 * Redis 客户端（带内存回退）
 *
 * 用于会话缓存、refresh token 存储等。
 * P0 阶段主要用于存储 refresh token。
 *
 * 策略：优先尝试连接 Redis；若连接失败或命令报错，自动回退到
 * 进程内 Map 存储。这样本地开发即便 Redis 未启动也能稳定运行。
 * 生产环境应强制使用 Redis，并通过 FALLBACK 开关禁用回退。
 */
import { createClient, type RedisClientType } from 'redis';
import { env } from '../../config/env.js';

// ---------- 内存回退存储 ----------
interface MemoryStoreEntry {
  value: string;
  expireAt?: number; // epoch ms，缺失表示不超时
}
const memStore = new Map<string, MemoryStoreEntry>();
const memExpireTimers = new Map<string, ReturnType<typeof setTimeout>>();

function memSet(key: string, value: string, opts?: { EX?: number }): void {
  const entry: MemoryStoreEntry = { value };
  if (opts?.EX != null) {
    entry.expireAt = Date.now() + opts.EX * 1000;
    // 清理旧 timer
    const t = memExpireTimers.get(key);
    if (t) clearTimeout(t);
    const newT = setTimeout(() => {
      memStore.delete(key);
      memExpireTimers.delete(key);
    }, opts.EX * 1000);
    newT.unref?.();
    memExpireTimers.set(key, newT);
  }
  memStore.set(key, entry);
}

function memGet(key: string): string | null {
  const entry = memStore.get(key);
  if (!entry) return null;
  if (entry.expireAt != null && Date.now() > entry.expireAt) {
    memStore.delete(key);
    memExpireTimers.delete(key);
    return null;
  }
  return entry.value;
}

function memDel(key: string): void {
  memStore.delete(key);
  const t = memExpireTimers.get(key);
  if (t) {
    clearTimeout(t);
    memExpireTimers.delete(key);
  }
}

// ---------- Redis 客户端 ----------
let redisClient: RedisClientType | null = null;
// 是否已经确定 Redis 不可用（连不上或第一波命令失败），
// 之后就不再尝试，直接走内存回退。
let redisDead = false;
// 是否处于"尝试启用"状态：只有第一次命令真的成功了，才认为 Redis 可用。
let redisConfirmed = false;

try {
  redisClient = createClient({
    url: env.REDIS_URL,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: (retries) => {
        // 最多重试 2 次，间隔 500ms，之后直接标记不可用
        if (retries > 2) {
          redisDead = true;
          return new Error('Redis reconnect max retries exceeded');
        }
        return 500;
      },
    },
  });

  redisClient.on('error', (err) => {
    if (!redisConfirmed) {
      redisDead = true;
    }
    console.warn('[redis] 错误:', err.message, '→ 已切换内存存储');
  });

  redisClient.on('end', () => {
    if (redisConfirmed) {
      console.warn('[redis] 连接已断开，后续命令将回退内存存储');
    }
  });

  // 连接 Redis（异步执行，不阻塞应用启动）
  redisClient.connect().then(() => {
    redisConfirmed = true;
    console.log('[redis] 连接成功');
  }).catch((err) => {
    redisDead = true;
    console.warn('[redis] 连接失败（', err.message, '）→ 已切换内存存储');
  });
} catch (err) {
  redisDead = true;
  console.warn('[redis] 初始化异常 → 已切换内存存储');
}

/**
 * set（带 EX 秒数）。若 Redis 不可用或命令失败，回退内存。
 */
export async function redisSet(
  key: string,
  value: string,
  opts?: { EX?: number },
): Promise<void> {
  if (!redisDead && redisClient && redisClient.isReady) {
    try {
      const res = await redisClient.set(key, value, opts?.EX != null ? { EX: opts.EX } : undefined);
      redisConfirmed = true;
      void res;
      return;
    } catch (err) {
      console.warn('[redis] set 失败 → 内存回退');
      // 标记不可用，后续直接用内存
      redisDead = true;
    }
  }
  memSet(key, value, opts);
}

/**
 * get。若 Redis 不可用或命令失败，回退内存。
 */
export async function redisGet(key: string): Promise<string | null> {
  if (!redisDead && redisClient && redisClient.isReady) {
    try {
      const v = await redisClient.get(key);
      redisConfirmed = true;
      return v;
    } catch (err) {
      console.warn('[redis] get 失败 → 内存回退');
      redisDead = true;
    }
  }
  return memGet(key);
}

/**
 * del。若 Redis 不可用或命令失败，回退内存。
 */
export async function redisDel(key: string): Promise<void> {
  if (!redisDead && redisClient && redisClient.isReady) {
    try {
      await redisClient.del(key);
      redisConfirmed = true;
      return;
    } catch (err) {
      console.warn('[redis] del 失败 → 内存回退');
      redisDead = true;
    }
  }
  memDel(key);
}

/**
 * 是否仍在使用内存回退（用于调试）
 */
export function isRedisFallbackActive(): boolean {
  return redisDead || !(redisClient && redisConfirmed);
}
