-- AlterTable: Add GST verification fields to agencies
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "gstVerifiedAt" TIMESTAMP(3);
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "gstVerifiedName" TEXT;

-- AlterTable: Add denormalized tracking fields to payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "agencyId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "packageId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "planId" TEXT;

-- CreateIndex: Unique constraint on GSTIN (prevents duplicate GST registrations)
CREATE UNIQUE INDEX IF NOT EXISTS "agencies_gstin_key" ON "agencies"("gstin");

-- CreateIndex: Payment tracking indexes
CREATE INDEX IF NOT EXISTS "payments_agencyId_status_idx" ON "payments"("agencyId", "status");
CREATE INDEX IF NOT EXISTS "payments_planId_idx" ON "payments"("planId");
CREATE INDEX IF NOT EXISTS "payments_packageId_idx" ON "payments"("packageId");

-- CreateIndex: Loyalty & user referral unique indexes (if not exist)
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_points_ledger_idempotencyKey_key" ON "loyalty_points_ledger"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "users_referralCode_key" ON "users"("referralCode");
