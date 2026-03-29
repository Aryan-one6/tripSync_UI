CREATE TYPE "FollowTargetType" AS ENUM ('USER', 'AGENCY');

CREATE TABLE "follows" (
  "id" TEXT NOT NULL,
  "followerUserId" TEXT NOT NULL,
  "targetType" "FollowTargetType" NOT NULL,
  "targetUserId" TEXT,
  "targetAgencyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "follows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "follows_target_check" CHECK (
    ("targetType" = 'USER' AND "targetUserId" IS NOT NULL AND "targetAgencyId" IS NULL)
    OR
    ("targetType" = 'AGENCY' AND "targetAgencyId" IS NOT NULL AND "targetUserId" IS NULL)
  )
);

CREATE UNIQUE INDEX "follows_followerUserId_targetUserId_key"
ON "follows"("followerUserId", "targetUserId");

CREATE UNIQUE INDEX "follows_followerUserId_targetAgencyId_key"
ON "follows"("followerUserId", "targetAgencyId");

CREATE INDEX "follows_targetUserId_idx" ON "follows"("targetUserId");
CREATE INDEX "follows_targetAgencyId_idx" ON "follows"("targetAgencyId");

ALTER TABLE "follows"
ADD CONSTRAINT "follows_followerUserId_fkey"
FOREIGN KEY ("followerUserId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follows"
ADD CONSTRAINT "follows_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "follows"
ADD CONSTRAINT "follows_targetAgencyId_fkey"
FOREIGN KEY ("targetAgencyId") REFERENCES "agencies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
