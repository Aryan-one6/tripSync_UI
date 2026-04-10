-- Migration: 202604110001_loyalty_points_and_payment_fields
-- Adds: LoyaltyPointsLedger table, referral fields on users,
--       payout tracking + loyalty guard fields on payments,
--       and performance indexes on GroupMember and ChatMessage.

-- ─── Enums ───────────────────────────────────────────────
CREATE TYPE "LoyaltyEventType" AS ENUM (
  'referral_inviter_bonus',
  'referral_new_user_bonus',
  'successful_trip_bonus',
  'redemption',
  'expiry',
  'manual_adjustment'
);

-- ─── Users: referral and loyalty fields ─────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "referralCode"      TEXT,
  ADD COLUMN IF NOT EXISTS "referredByUserId"  TEXT,
  ADD COLUMN IF NOT EXISTS "referralBonusPaid" BOOLEAN NOT NULL DEFAULT FALSE;

-- Unique constraint on referralCode (soft – only non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key"
  ON "users"("referralCode")
  WHERE "referralCode" IS NOT NULL;

-- Index for fast referral code lookups
CREATE INDEX IF NOT EXISTS "users_referralCode_idx"
  ON "users"("referralCode");

-- ─── Payments: payout tracking and loyalty guard ─────────
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "agencyNetAmount"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "initialPayout"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "finalPayout"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pointsRedeemed"   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tripBonusIssued"  BOOLEAN NOT NULL DEFAULT FALSE;

-- Performance indexes on payments
CREATE INDEX IF NOT EXISTS "payments_userId_status_idx"  ON "payments"("userId", "status");
CREATE INDEX IF NOT EXISTS "payments_groupId_status_idx" ON "payments"("groupId", "status");

-- ─── GroupMember performance indexes ────────────────────
CREATE INDEX IF NOT EXISTS "group_members_groupId_status_idx" ON "group_members"("groupId", "status");
CREATE INDEX IF NOT EXISTS "group_members_userId_status_idx"  ON "group_members"("userId", "status");

-- ─── ChatMessage: extra index for type filtering ─────────
CREATE INDEX IF NOT EXISTS "chat_messages_groupId_messageType_idx"
  ON "chat_messages"("groupId", "messageType");

-- ─── LoyaltyPointsLedger table ───────────────────────────
CREATE TABLE IF NOT EXISTS "loyalty_points_ledger" (
  "id"               TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "eventType"        "LoyaltyEventType" NOT NULL,
  "points"           INTEGER NOT NULL,
  "description"      TEXT NOT NULL,
  "idempotencyKey"   TEXT,
  "groupId"          TEXT,
  "paymentId"        TEXT,
  "referredUserId"   TEXT,
  "expiresAt"        TIMESTAMP(3),
  "expired"          BOOLEAN NOT NULL DEFAULT FALSE,
  "expiredAt"        TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "loyalty_points_ledger_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on idempotency key (prevents double-crediting)
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_points_ledger_idempotencyKey_key"
  ON "loyalty_points_ledger"("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

-- Foreign key: userId -> users.id (cascade delete)
ALTER TABLE "loyalty_points_ledger"
  ADD CONSTRAINT "loyalty_points_ledger_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS "loyalty_points_ledger_userId_createdAt_idx"
  ON "loyalty_points_ledger"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "loyalty_points_ledger_userId_expired_expiresAt_idx"
  ON "loyalty_points_ledger"("userId", "expired", "expiresAt");

CREATE INDEX IF NOT EXISTS "loyalty_points_ledger_idempotencyKey_idx"
  ON "loyalty_points_ledger"("idempotencyKey");
