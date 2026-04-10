import IORedis from 'ioredis';
import { env } from './env.js';

type StoreEntry = {
  value: string;
  expiresAt: number | null;
};

const memoryStore = new Map<string, StoreEntry>();

class MemoryRedis {
  private resolveEntry(key: string) {
    const entry = memoryStore.get(key);
    if (!entry) return null;

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }

    return entry;
  }

  async get(key: string): Promise<string | null> {
    return this.resolveEntry(key)?.value ?? null;
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<'OK'> {
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return memoryStore.delete(key) ? 1 : 0;
  }

  async incr(key: string): Promise<number> {
    const current = Number(this.resolveEntry(key)?.value ?? '0') || 0;
    const next = current + 1;
    memoryStore.set(key, {
      value: String(next),
      expiresAt: this.resolveEntry(key)?.expiresAt ?? null,
    });
    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    const entry = this.resolveEntry(key);
    if (!entry) return 0;

    memoryStore.set(key, {
      ...entry,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return 1;
  }

  duplicate() {
    return this;
  }

  on(_event: string, _handler: (err: Error) => void) {
    return this;
  }
}

const LOCAL_REDIS_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
type RedisConfigState = {
  enabled: boolean;
  host: string | null;
  reason: 'ok' | 'missing_url' | 'localhost_in_production';
};

function resolveRedisConfigState(): RedisConfigState {
  if (!env.REDIS_URL) {
    return { enabled: false, host: null, reason: 'missing_url' };
  }

  const redisHost = new URL(env.REDIS_URL).hostname.toLowerCase();
  const isLocalRedisHost = LOCAL_REDIS_HOSTS.has(redisHost);
  const isProductionRuntime = env.NODE_ENV === 'production';

  if (isProductionRuntime && isLocalRedisHost) {
    console.warn(
      `Redis is disabled because REDIS_URL points to local host (${redisHost}) in production runtime.`,
    );
    return { enabled: false, host: redisHost, reason: 'localhost_in_production' };
  }

  return { enabled: true, host: redisHost, reason: 'ok' };
}

const redisConfigState = resolveRedisConfigState();

export const isRedisConfigured = redisConfigState.enabled;
export const redisHost = redisConfigState.host;
export const redisConfigReason = redisConfigState.reason;

const createRedisClient = () =>
  new (IORedis as any)(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }) as InstanceType<typeof IORedis.default>;

export const redis = isRedisConfigured ? createRedisClient() : new MemoryRedis();
export const redisSub = isRedisConfigured ? createRedisClient() : new MemoryRedis();

if (isRedisConfigured) {
  redis.on('error', (err: Error) => console.error('Redis client error:', err));
  redisSub.on('error', (err: Error) => console.error('Redis subscriber error:', err));
} else {
  console.warn('Redis is not configured. Falling back to in-memory cache semantics.');
}
