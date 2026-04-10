import IORedis from 'ioredis';

async function main() {
  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    console.error('REDIS_URL is missing. Set it in apps/api/.env first.');
    process.exit(1);
  }

  let parsed: URL;
  try {
    parsed = new URL(redisUrl);
  } catch {
    console.error('REDIS_URL is not a valid URL.');
    process.exit(1);
  }

  if (parsed.protocol !== 'rediss:') {
    console.error(
      `REDIS_URL must use rediss:// for TLS. Current protocol is ${parsed.protocol}`,
    );
    process.exit(1);
  }

  const redis = new (IORedis as any)(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 10_000,
    enableReadyCheck: true,
    tls: {},
  }) as InstanceType<typeof IORedis.default>;

  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error(`Unexpected ping response: ${pong}`);
    }
    console.log(`Redis connection OK (host: ${parsed.hostname})`);
  } finally {
    await redis.quit().catch(async () => {
      await redis.disconnect();
    });
  }
}

void main().catch((error) => {
  console.error('Redis check failed.');
  console.error(error);
  process.exit(1);
});
