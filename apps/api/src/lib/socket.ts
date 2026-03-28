import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { env } from './env.js';
import { isRedisConfigured, redis, redisSub } from './redis.js';
import { prisma } from './prisma.js';
import { verifyAccessToken } from '../modules/auth/jwt.js';

type SocketData = {
  userId: string;
  role: 'user' | 'agency_admin' | 'platform_admin';
  agencyId: string | null;
};

let io: Server | null = null;
const socketRuntimeEnabled = !env.VERCEL;

function userRoom(userId: string) {
  return `user:${userId}`;
}

function agencyRoom(agencyId: string) {
  return `agency:${agencyId}`;
}

function groupRoom(groupId: string) {
  return `group:${groupId}`;
}

async function userCanAccessGroup(userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true, status: true },
  });

  return Boolean(membership && membership.status !== 'LEFT' && membership.status !== 'REMOVED');
}

export function initSocket(server: HttpServer) {
  if (io) return io;
  if (!socketRuntimeEnabled) {
    console.warn('Socket.IO runtime is disabled on Vercel.');
    return null;
  }

  io = new Server(server, {
    cors: { origin: env.FRONTEND_URL, credentials: true },
  });

  if (isRedisConfigured) {
    io.adapter(createAdapter(redis.duplicate(), redisSub.duplicate()));
  } else {
    console.warn('Socket.IO Redis adapter is disabled because REDIS_URL is not configured.');
  }

  io.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (typeof socket.handshake.headers.authorization === 'string' &&
      socket.handshake.headers.authorization.startsWith('Bearer ')
        ? socket.handshake.headers.authorization.slice(7)
        : null);

    if (!token) {
      next(new Error('Missing socket token'));
      return;
    }

    const payload = await verifyAccessToken(token);
    if (!payload) {
      next(new Error('Invalid socket token'));
      return;
    }

    socket.data = {
      userId: payload.userId,
      role: payload.role,
      agencyId: payload.agencyId ?? null,
    } as SocketData;

    next();
  });

  io.on('connection', async (socket) => {
    const data = socket.data as SocketData;
    socket.join(userRoom(data.userId));

    if (data.agencyId) {
      socket.join(agencyRoom(data.agencyId));
    }

    const groups = await prisma.groupMember.findMany({
      where: {
        userId: data.userId,
        status: { in: ['INTERESTED', 'APPROVED', 'COMMITTED'] },
      },
      select: { groupId: true },
    });

    for (const membership of groups) {
      socket.join(groupRoom(membership.groupId));
    }

    socket.on('group:subscribe', async (groupId: string) => {
      if (typeof groupId !== 'string' || !groupId) return;
      if (await userCanAccessGroup(data.userId, groupId)) {
        socket.join(groupRoom(groupId));
      }
    });

    socket.on('group:unsubscribe', (groupId: string) => {
      if (typeof groupId !== 'string' || !groupId) return;
      socket.leave(groupRoom(groupId));
    });
  });

  return io;
}

export function emitGroupEvent(groupId: string, event: string, payload: unknown) {
  io?.to(groupRoom(groupId)).emit(event, payload);
}

export function emitUserEvent(userId: string, event: string, payload: unknown) {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function emitAgencyEvent(agencyId: string, event: string, payload: unknown) {
  io?.to(agencyRoom(agencyId)).emit(event, payload);
}
