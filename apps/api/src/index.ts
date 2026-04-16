import { createServer } from 'http';
import { env } from './lib/env.js';
import app from './app.js';
import { initSocket } from './lib/socket.js';
import { isRedisConfigured, redisConfigReason, redisHost } from './lib/redis.js';
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`TravellersIn API running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  if (isRedisConfigured) {
    console.log(`Redis: enabled (${redisHost ?? 'unknown-host'})`);
  } else {
    console.log(`Redis: disabled (${redisConfigReason})`);
  }
});

export { app, httpServer };
