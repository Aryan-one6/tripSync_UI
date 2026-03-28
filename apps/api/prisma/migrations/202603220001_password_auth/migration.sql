ALTER TABLE "users"
ADD COLUMN "username" TEXT,
ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
