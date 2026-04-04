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
  fullName: string;
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

function directRoom(conversationId: string) {
  return `direct:${conversationId}`;
}

async function userCanAccessGroup(userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    select: { id: true, status: true },
  });

  return Boolean(membership && membership.status !== 'LEFT' && membership.status !== 'REMOVED');
}

async function userCanAccessDirectConversation(userId: string, conversationId: string) {
  const participant = await prisma.directConversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    select: { id: true },
  });

  return Boolean(participant);
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
    const adapterPub = redis.duplicate();
    const adapterSub = redisSub.duplicate();
    adapterPub.on('error', (err: Error) =>
      console.error('Redis adapter publisher error:', err),
    );
    adapterSub.on('error', (err: Error) =>
      console.error('Redis adapter subscriber error:', err),
    );
    io.adapter(createAdapter(adapterPub, adapterSub));
  } else {
    console.warn('Socket.IO Redis adapter is disabled because Redis is unavailable in this runtime.');
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { fullName: true },
    });
    if (!user) {
      next(new Error('Socket user not found'));
      return;
    }

    socket.data = {
      userId: payload.userId,
      role: payload.role,
      agencyId: payload.agencyId ?? null,
      fullName: user.fullName,
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
        status: { in: ['APPROVED', 'COMMITTED'] },
      },
      select: { groupId: true },
    });

    for (const membership of groups) {
      socket.join(groupRoom(membership.groupId));
    }

    const directConversations = await prisma.directConversationParticipant.findMany({
      where: { userId: data.userId },
      select: { conversationId: true },
    });

    for (const participant of directConversations) {
      socket.join(directRoom(participant.conversationId));
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

    socket.on('direct:subscribe', async (conversationId: string) => {
      if (typeof conversationId !== 'string' || !conversationId) return;
      if (await userCanAccessDirectConversation(data.userId, conversationId)) {
        socket.join(directRoom(conversationId));
      }
    });

    socket.on('direct:unsubscribe', (conversationId: string) => {
      if (typeof conversationId !== 'string' || !conversationId) return;
      socket.leave(directRoom(conversationId));
    });

    socket.on(
      'group:typing',
      async (payload: { groupId?: string; isTyping?: boolean }) => {
        const groupId = typeof payload?.groupId === 'string' ? payload.groupId : '';
        if (!groupId) return;
        if (!(await userCanAccessGroup(data.userId, groupId))) return;

        io?.to(groupRoom(groupId)).emit('chat:typing', {
          groupId,
          userId: data.userId,
          fullName: data.fullName,
          isTyping: Boolean(payload?.isTyping),
        });
      },
    );

    socket.on(
      'direct:typing',
      async (payload: { conversationId?: string; isTyping?: boolean }) => {
        const conversationId = typeof payload?.conversationId === 'string' ? payload.conversationId : '';
        if (!conversationId) return;
        if (!(await userCanAccessDirectConversation(data.userId, conversationId))) return;

        io?.to(directRoom(conversationId)).emit('direct:typing', {
          conversationId,
          userId: data.userId,
          fullName: data.fullName,
          isTyping: Boolean(payload?.isTyping),
        });
      },
    );
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

export function emitDirectConversationEvent(conversationId: string, event: string, payload: unknown) {
  io?.to(directRoom(conversationId)).emit(event, payload);
}
