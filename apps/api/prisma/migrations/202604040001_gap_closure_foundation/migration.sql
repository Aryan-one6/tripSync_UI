DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentSource') THEN
    CREATE TYPE "PaymentSource" AS ENUM ('PLAN_OFFER', 'PACKAGE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransferStatus') THEN
    CREATE TYPE "TransferStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SETTLED', 'FAILED', 'MANUAL');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletPayoutMode') THEN
    CREATE TYPE "WalletPayoutMode" AS ENUM ('TRUST', 'PRO');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgencyMemberRole') THEN
    CREATE TYPE "AgencyMemberRole" AS ENUM ('ADMIN', 'MANAGER', 'AGENT', 'FINANCE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeStatus') THEN
    CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'EVIDENCE_REQUIRED', 'RESOLVED', 'REJECTED', 'SPLIT_REFUND');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DisputeResolution') THEN
    CREATE TYPE "DisputeResolution" AS ENUM ('USER_FAVOR', 'AGENCY_FAVOR', 'SPLIT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RiskFlagType') THEN
    CREATE TYPE "RiskFlagType" AS ENUM ('CONTACT_SHARING', 'PAYMENT_BYPASS', 'CANCELLATION_ABUSE', 'PAYMENT_ANOMALY', 'AGENCY_INACTIVITY');
  END IF;
END $$;

ALTER TABLE "packages"
  ADD COLUMN IF NOT EXISTS "cancellationRules" JSONB;

ALTER TABLE "offers"
  ADD COLUMN IF NOT EXISTS "cancellationRules" JSONB;

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "tripAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "platformFeeAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "feeGstAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "commissionAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "source" "PaymentSource" NOT NULL DEFAULT 'PLAN_OFFER',
  ADD COLUMN IF NOT EXISTS "transferStatus" "TransferStatus" NOT NULL DEFAULT 'QUEUED',
  ADD COLUMN IF NOT EXISTS "transferReference" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "agency_members" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "AgencyMemberRole" NOT NULL DEFAULT 'AGENT',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "invitedBy" TEXT,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agency_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_members_agencyId_userId_key" ON "agency_members"("agencyId", "userId");
CREATE INDEX IF NOT EXISTS "agency_members_agencyId_role_isActive_idx" ON "agency_members"("agencyId", "role", "isActive");

ALTER TABLE "agency_members"
  ADD CONSTRAINT "agency_members_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agency_members"
  ADD CONSTRAINT "agency_members_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "agency_wallets" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "pendingBalance" INTEGER NOT NULL DEFAULT 0,
  "availableBalance" INTEGER NOT NULL DEFAULT 0,
  "totalEarned" INTEGER NOT NULL DEFAULT 0,
  "totalCommission" INTEGER NOT NULL DEFAULT 0,
  "securityDeposit" INTEGER NOT NULL DEFAULT 0,
  "payoutMode" "WalletPayoutMode" NOT NULL DEFAULT 'TRUST',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agency_wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_wallets_agencyId_key" ON "agency_wallets"("agencyId");

ALTER TABLE "agency_wallets"
  ADD CONSTRAINT "agency_wallets_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "agency_transactions" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "groupId" TEXT,
  "paymentId" TEXT,
  "razorpayTransferId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agency_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agency_transactions_walletId_createdAt_idx" ON "agency_transactions"("walletId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "agency_transactions_paymentId_idx" ON "agency_transactions"("paymentId");

ALTER TABLE "agency_transactions"
  ADD CONSTRAINT "agency_transactions_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES "agency_wallets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "invoices" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "platformFeeAmount" INTEGER NOT NULL DEFAULT 0,
  "feeGstAmount" INTEGER NOT NULL DEFAULT 0,
  "commissionAmount" INTEGER NOT NULL DEFAULT 0,
  "totalAmount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "status" TEXT NOT NULL DEFAULT 'issued',
  "pdfUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_paymentId_key" ON "invoices"("paymentId");
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "invoices_agencyId_createdAt_idx" ON "invoices"("agencyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "invoices_userId_createdAt_idx" ON "invoices"("userId", "createdAt" DESC);

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "disputes" (
  "id" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" "DisputeResolution",
  "resolutionNotes" TEXT,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "disputes_paymentId_key" ON "disputes"("paymentId");
CREATE INDEX IF NOT EXISTS "disputes_agencyId_status_createdAt_idx" ON "disputes"("agencyId", "status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "disputes_createdByUserId_createdAt_idx" ON "disputes"("createdByUserId", "createdAt" DESC);

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "groups"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes"
  ADD CONSTRAINT "disputes_resolvedByUserId_fkey"
  FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "agency_trust_profiles" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "trustScore" INTEGER NOT NULL DEFAULT 0,
  "eligibleForPro" BOOLEAN NOT NULL DEFAULT false,
  "completedTripsCount" INTEGER NOT NULL DEFAULT 0,
  "averageRatingSnapshot" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "recentDisputesCount" INTEGER NOT NULL DEFAULT 0,
  "lastEvaluatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agency_trust_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_trust_profiles_agencyId_key" ON "agency_trust_profiles"("agencyId");

ALTER TABLE "agency_trust_profiles"
  ADD CONSTRAINT "agency_trust_profiles_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "insurance_quotes" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "groupId" TEXT,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "planCode" TEXT,
  "premium" INTEGER,
  "coverage" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "insurance_quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "insurance_quotes_agencyId_createdAt_idx" ON "insurance_quotes"("agencyId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "insurance_quotes_userId_createdAt_idx" ON "insurance_quotes"("userId", "createdAt" DESC);

ALTER TABLE "insurance_quotes"
  ADD CONSTRAINT "insurance_quotes_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "agency_customers" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tags" JSONB,
  "notes" TEXT,
  "lastTripAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agency_customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_customers_agencyId_userId_key" ON "agency_customers"("agencyId", "userId");
CREATE INDEX IF NOT EXISTS "agency_customers_agencyId_createdAt_idx" ON "agency_customers"("agencyId", "createdAt" DESC);

ALTER TABLE "agency_customers"
  ADD CONSTRAINT "agency_customers_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agency_customers"
  ADD CONSTRAINT "agency_customers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "agency_campaigns" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "targetTags" JSONB,
  "scheduledAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agency_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agency_campaigns_agencyId_status_createdAt_idx" ON "agency_campaigns"("agencyId", "status", "createdAt" DESC);

ALTER TABLE "agency_campaigns"
  ADD CONSTRAINT "agency_campaigns_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "fraud_risk_flags" (
  "id" TEXT NOT NULL,
  "agencyId" TEXT,
  "userId" TEXT,
  "groupId" TEXT,
  "paymentId" TEXT,
  "messageId" TEXT,
  "type" "RiskFlagType" NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "details" JSONB,
  "raisedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNotes" TEXT,
  CONSTRAINT "fraud_risk_flags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "fraud_risk_flags_agencyId_type_createdAt_idx" ON "fraud_risk_flags"("agencyId", "type", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "fraud_risk_flags_userId_type_createdAt_idx" ON "fraud_risk_flags"("userId", "type", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "fraud_risk_flags_groupId_createdAt_idx" ON "fraud_risk_flags"("groupId", "createdAt" DESC);

ALTER TABLE "fraud_risk_flags"
  ADD CONSTRAINT "fraud_risk_flags_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "agencies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fraud_risk_flags"
  ADD CONSTRAINT "fraud_risk_flags_raisedByUserId_fkey"
  FOREIGN KEY ("raisedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
