-- Revert application-level field encryption: these columns currently hold
-- plain numeric strings (already decrypted by a one-off script run just
-- before this migration), so an explicit USING cast back to the original
-- numeric types is safe and lossless.

-- AlterTable
ALTER TABLE "Expense" ALTER COLUMN "amount" SET DATA TYPE INTEGER USING "amount"::INTEGER;

-- AlterTable
ALTER TABLE "Stock"
  ALTER COLUMN "shares" SET DATA TYPE DOUBLE PRECISION USING "shares"::DOUBLE PRECISION,
  ALTER COLUMN "avgCost" SET DATA TYPE DOUBLE PRECISION USING "avgCost"::DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "monthlyBudget" SET DATA TYPE INTEGER USING "monthlyBudget"::INTEGER;
