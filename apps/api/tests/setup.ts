/**
 * tests/setup.ts
 * Global setup — runs before every test file.
 *
 * 1. Injects required environment variables so `env.ts` doesn't call process.exit().
 * 2. Mocks socket.io event emitters so tests don't need Redis.
 * 3. Mocks BullMQ queue so tests don't need a Redis connection.
 */

import { vi } from 'vitest';

// ─── 1. Inject minimal required env vars ────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/tripsync_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars-exactly!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-exactly!';
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:3000';

// ─── 2. Stub socket emitters so no Redis is required ────────────────────────
vi.mock('../src/lib/socket.js', () => ({
  emitUserEvent: vi.fn(),
  emitAgencyEvent: vi.fn(),
  emitGroupEvent: vi.fn(),
  getIO: vi.fn(() => ({
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  })),
}));

// ─── 3. Stub BullMQ notification queue ──────────────────────────────────────
vi.mock('../src/lib/queue.js', () => ({
  queueNotification: vi.fn().mockResolvedValue(undefined),
}));
