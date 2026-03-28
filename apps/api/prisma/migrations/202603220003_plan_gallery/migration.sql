ALTER TABLE "plans"
ADD COLUMN IF NOT EXISTS "galleryUrls" JSONB;

UPDATE "plans"
SET "galleryUrls" = jsonb_build_array("coverImageUrl")
WHERE "coverImageUrl" IS NOT NULL
  AND (
    "galleryUrls" IS NULL
    OR jsonb_typeof("galleryUrls") <> 'array'
    OR jsonb_array_length("galleryUrls") = 0
  );
