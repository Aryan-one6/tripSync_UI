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

export const isRedisConfigured = Boolean(env.REDIS_URL);

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
