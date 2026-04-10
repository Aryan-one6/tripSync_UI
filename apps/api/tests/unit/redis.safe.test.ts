import { afterEach, describe, expect, it, vi } from 'vitest';
import { redis, redisDelSafe, redisGetSafe, redisSetexSafe } from '../../src/lib/redis.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Redis safe helpers', () => {
  it('redisGetSafe returns null when redis get throws', async () => {
    vi.spyOn(redis, 'get').mockRejectedValueOnce(new Error('boom'));

    await expect(redisGetSafe('chat:test')).resolves.toBeNull();
  });

  it('redisSetexSafe swallows redis setex failures', async () => {
    vi.spyOn(redis, 'setex').mockRejectedValueOnce(new Error('boom'));

    await expect(redisSetexSafe('chat:test', 30, 'payload')).resolves.toBeUndefined();
  });

  it('redisDelSafe swallows redis del failures', async () => {
    vi.spyOn(redis, 'del').mockRejectedValueOnce(new Error('boom'));

    await expect(redisDelSafe('chat:test')).resolves.toBeUndefined();
  });
});
