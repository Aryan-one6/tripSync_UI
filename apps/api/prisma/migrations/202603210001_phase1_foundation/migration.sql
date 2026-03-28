-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "VerificationTier" AS ENUM ('BASIC', 'VERIFIED', 'TRUSTED');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'OPEN', 'CONFIRMING', 'CONFIRMED', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'COUNTERED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('INTERESTED', 'APPROVED', 'COMMITTED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('CREATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'PARTIAL_RELEASE', 'RELEASED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "fullName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "city" TEXT,
    "bio" TEXT,
    "verification" "VerificationTier" NOT NULL DEFAULT 'BASIC',
    "aadhaarHash" TEXT,
    "completedTrips" INTEGER NOT NULL DEFAULT 0,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agencies" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "gstin" TEXT,
    "pan" TEXT,
    "tourismLicense" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "specializations" JSONB,
    "destinations" JSONB,
    "verification" TEXT NOT NULL DEFAULT 'pending',
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationState" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isDateFlexible" BOOLEAN NOT NULL DEFAULT false,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "groupSizeMin" INTEGER NOT NULL DEFAULT 4,
    "groupSizeMax" INTEGER NOT NULL DEFAULT 15,
    "vibes" JSONB,
    "accommodation" TEXT,
    "groupType" TEXT,
    "genderPref" TEXT,
    "ageRangeMin" INTEGER,
    "ageRangeMax" INTEGER,
    "activities" JSONB,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "autoApprove" BOOLEAN NOT NULL DEFAULT true,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "selectedOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationState" TEXT,
    "itinerary" JSONB,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "departureDates" JSONB,
    "basePrice" INTEGER NOT NULL,
    "pricingTiers" JSONB,
    "groupSizeMin" INTEGER NOT NULL DEFAULT 4,
    "groupSizeMax" INTEGER NOT NULL DEFAULT 20,
    "inclusions" JSONB,
    "exclusions" TEXT,
    "accommodation" TEXT,
    "vibes" JSONB,
    "activities" JSONB,
    "galleryUrls" JSONB,
    "cancellationPolicy" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "planId" TEXT,
    "packageId" TEXT,
    "currentSize" INTEGER NOT NULL DEFAULT 0,
    "maleCount" INTEGER NOT NULL DEFAULT 0,
    "femaleCount" INTEGER NOT NULL DEFAULT 0,
    "otherCount" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MemberStatus" NOT NULL DEFAULT 'INTERESTED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "pricePerPerson" INTEGER NOT NULL,
    "pricingTiers" JSONB,
    "inclusions" JSONB,
    "itinerary" JSONB,
    "cancellationPolicy" TEXT,
    "validUntil" TIMESTAMP(3),
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "isReferred" BOOLEAN NOT NULL DEFAULT false,
    "referredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_negotiations" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "senderType" TEXT NOT NULL,
    "price" INTEGER,
    "inclusionsDelta" JSONB,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'HELD',
    "tranche1Released" BOOLEAN NOT NULL DEFAULT false,
    "tranche2Released" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewType" TEXT NOT NULL,
    "targetAgencyId" TEXT,
    "targetUserId" TEXT,
    "groupId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "safetyRating" INTEGER NOT NULL,
    "valueRating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT,
    "messageType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_ownerId_key" ON "agencies"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "agencies_slug_key" ON "agencies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "plans_slug_key" ON "plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "plans_selectedOfferId_key" ON "plans"("selectedOfferId");

-- CreateIndex
CREATE INDEX "plans_status_idx" ON "plans"("status");

-- CreateIndex
CREATE INDEX "plans_destination_idx" ON "plans"("destination");

-- CreateIndex
CREATE INDEX "plans_startDate_endDate_idx" ON "plans"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "packages_slug_key" ON "packages"("slug");

-- CreateIndex
CREATE INDEX "packages_status_idx" ON "packages"("status");

-- CreateIndex
CREATE INDEX "packages_destination_idx" ON "packages"("destination");

-- CreateIndex
CREATE INDEX "packages_basePrice_idx" ON "packages"("basePrice");

-- CreateIndex
CREATE UNIQUE INDEX "groups_planId_key" ON "groups"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "groups_packageId_key" ON "groups"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_userId_key" ON "group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "offers_planId_status_idx" ON "offers"("planId", "status");

-- CreateIndex
CREATE INDEX "offers_agencyId_isReferred_referredAt_idx" ON "offers"("agencyId", "isReferred", "referredAt");

-- CreateIndex
CREATE UNIQUE INDEX "offers_planId_agencyId_key" ON "offers"("planId", "agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewerId_groupId_targetAgencyId_key" ON "reviews"("reviewerId", "groupId", "targetAgencyId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_reviewerId_groupId_targetUserId_key" ON "reviews"("reviewerId", "groupId", "targetUserId");

-- CreateIndex
CREATE INDEX "chat_messages_groupId_createdAt_idx" ON "chat_messages"("groupId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_selectedOfferId_fkey" FOREIGN KEY ("selectedOfferId") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "agencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_negotiations" ADD CONSTRAINT "offer_negotiations_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "offers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_targetAgencyId_fkey" FOREIGN KEY ("targetAgencyId") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "offers_one_accepted_per_plan" ON "offers"("planId") WHERE "status" = 'ACCEPTED';

-- CreateIndex
CREATE INDEX "plans_open_createdAt_idx" ON "plans"("createdAt" DESC) WHERE "status" = 'OPEN';

-- CreateIndex
CREATE INDEX "packages_open_createdAt_idx" ON "packages"("createdAt" DESC) WHERE "status" = 'OPEN';

-- CreateView
CREATE OR REPLACE VIEW "discover_feed" AS
  SELECT
    p."id",
    p."slug",
    'plan'::TEXT AS "originType",
    p."title",
    p."destination",
    p."destinationState",
    p."startDate",
    p."endDate",
    p."budgetMin" AS "priceLow",
    p."budgetMax" AS "priceHigh",
    p."vibes",
    p."groupType",
    p."groupSizeMin",
    p."groupSizeMax",
    p."coverImageUrl",
    p."status"::TEXT AS "status",
    p."createdAt",
    p."creatorId" AS "ownerId",
    NULL::TEXT AS "agencyId",
    COALESCE(g."currentSize", 0) AS "joinedCount"
  FROM "plans" p
  LEFT JOIN "groups" g ON g."planId" = p."id"
  WHERE p."status" = 'OPEN'
  UNION ALL
  SELECT
    pk."id",
    pk."slug",
    'package'::TEXT AS "originType",
    pk."title",
    pk."destination",
    pk."destinationState",
    pk."startDate",
    pk."endDate",
    pk."basePrice" AS "priceLow",
    pk."basePrice" AS "priceHigh",
    pk."vibes",
    NULL::TEXT AS "groupType",
    pk."groupSizeMin",
    pk."groupSizeMax",
    pk."galleryUrls"->>0 AS "coverImageUrl",
    pk."status"::TEXT AS "status",
    pk."createdAt",
    NULL::TEXT AS "ownerId",
    pk."agencyId",
    COALESCE(g."currentSize", 0) AS "joinedCount"
  FROM "packages" pk
  LEFT JOIN "groups" g ON g."packageId" = pk."id"
  WHERE pk."status" = 'OPEN';
