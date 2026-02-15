-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "icon" VARCHAR(50),
    "color" CHAR(7) NOT NULL DEFAULT '#00B9AE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Add accountId column to transactions (nullable for migration)
ALTER TABLE "transactions" ADD COLUMN "accountId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_userId_name_key" ON "accounts"("userId", "name");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE INDEX "accounts_userId_isDefault_idx" ON "accounts"("userId", "isDefault");
CREATE INDEX "transactions_accountId_idx" ON "transactions"("accountId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data Migration: Create default account for each existing user
INSERT INTO "accounts" ("id", "userId", "name", "currency", "isDefault", "sortOrder", "createdAt", "updatedAt")
SELECT
    gen_random_uuid(),
    "id",
    CONCAT('Cuenta ', "primaryCurrency"),
    "primaryCurrency",
    true,
    0,
    NOW(),
    NOW()
FROM "users";

-- Data Migration: Assign existing transactions to their user's default account
UPDATE "transactions" t
SET "accountId" = (
    SELECT a."id"
    FROM "accounts" a
    WHERE a."userId" = t."userId"
    AND a."isDefault" = true
    LIMIT 1
)
WHERE t."accountId" IS NULL;
