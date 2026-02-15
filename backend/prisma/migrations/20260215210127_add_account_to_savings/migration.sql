-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "savings_deposits" ADD COLUMN     "accountId" UUID;

-- AlterTable
ALTER TABLE "savings_goals" ADD COLUMN     "defaultAccountId" UUID;

-- CreateIndex
CREATE INDEX "savings_deposits_accountId_idx" ON "savings_deposits"("accountId");

-- CreateIndex
CREATE INDEX "savings_goals_defaultAccountId_idx" ON "savings_goals"("defaultAccountId");

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_deposits" ADD CONSTRAINT "savings_deposits_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
