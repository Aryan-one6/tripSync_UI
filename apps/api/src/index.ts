import { createServer } from 'http';
import { env } from './lib/env.js';
import app from './app.js';
import { initSocket } from './lib/socket.js';
const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`TravellersIn API running on port ${env.PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

export { app, httpServer };
