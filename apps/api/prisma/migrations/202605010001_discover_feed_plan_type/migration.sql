-- Ensure discover_feed exposes planType used by discover filters.
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
    COALESCE(g."currentSize", 0) AS "joinedCount",
    p."planType"::TEXT AS "planType"
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
    COALESCE(g."currentSize", 0) AS "joinedCount",
    NULL::TEXT AS "planType"
  FROM "packages" pk
  LEFT JOIN "groups" g ON g."packageId" = pk."id"
  WHERE pk."status" = 'OPEN';
