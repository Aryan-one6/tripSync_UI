ALTER TABLE "plans"
ALTER COLUMN "autoApprove" SET DEFAULT false;

ALTER TABLE "groups"
ADD COLUMN "paymentWindowEndsAt" TIMESTAMP(3);
