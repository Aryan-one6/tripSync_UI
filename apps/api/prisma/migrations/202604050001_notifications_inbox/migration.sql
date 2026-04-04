DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProfileViewTargetType') THEN
    CREATE TYPE "ProfileViewTargetType" AS ENUM ('USER', 'AGENCY');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx"
  ON "notifications"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "notifications_userId_readAt_createdAt_idx"
  ON "notifications"("userId", "readAt", "createdAt" DESC);

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "profile_views" (
  "id" TEXT NOT NULL,
  "viewerUserId" TEXT NOT NULL,
  "targetOwnerUserId" TEXT NOT NULL,
  "targetType" "ProfileViewTargetType" NOT NULL,
  "targetUserId" TEXT,
  "targetAgencyId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "profile_views_targetOwnerUserId_createdAt_idx"
  ON "profile_views"("targetOwnerUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "profile_views_viewerUserId_createdAt_idx"
  ON "profile_views"("viewerUserId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "profile_views_targetUserId_idx"
  ON "profile_views"("targetUserId");

CREATE INDEX IF NOT EXISTS "profile_views_targetAgencyId_idx"
  ON "profile_views"("targetAgencyId");

ALTER TABLE "profile_views"
  ADD CONSTRAINT "profile_views_viewerUserId_fkey"
  FOREIGN KEY ("viewerUserId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profile_views"
  ADD CONSTRAINT "profile_views_targetOwnerUserId_fkey"
  FOREIGN KEY ("targetOwnerUserId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "profile_views"
  ADD CONSTRAINT "profile_views_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "profile_views"
  ADD CONSTRAINT "profile_views_targetAgencyId_fkey"
  FOREIGN KEY ("targetAgencyId") REFERENCES "agencies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
