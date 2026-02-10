-- AlterTable
ALTER TABLE "savings_goals" ADD COLUMN     "deductFromBalance" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "savings_deposits" (
    "id" UUID NOT NULL,
    "savingsGoalId" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "note" TEXT,
    "date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "savings_deposits_savingsGoalId_idx" ON "savings_deposits"("savingsGoalId");

-- AddForeignKey
ALTER TABLE "savings_deposits" ADD CONSTRAINT "savings_deposits_savingsGoalId_fkey" FOREIGN KEY ("savingsGoalId") REFERENCES "savings_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
