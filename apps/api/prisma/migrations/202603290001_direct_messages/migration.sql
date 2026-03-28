CREATE TABLE "direct_conversations" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "direct_conversations_key_key" ON "direct_conversations"("key");

CREATE TABLE "direct_conversation_participants" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_conversation_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "direct_conversation_participants_conversationId_userId_key"
ON "direct_conversation_participants"("conversationId", "userId");

CREATE INDEX "direct_conversation_participants_userId_createdAt_idx"
ON "direct_conversation_participants"("userId", "createdAt" DESC);

CREATE TABLE "direct_messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "direct_messages_conversationId_createdAt_idx"
ON "direct_messages"("conversationId", "createdAt" DESC);

ALTER TABLE "direct_conversation_participants"
ADD CONSTRAINT "direct_conversation_participants_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "direct_conversations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_conversation_participants"
ADD CONSTRAINT "direct_conversation_participants_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_messages"
ADD CONSTRAINT "direct_messages_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "direct_conversations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "direct_messages"
ADD CONSTRAINT "direct_messages_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
