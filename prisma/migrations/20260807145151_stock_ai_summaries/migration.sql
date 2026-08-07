-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "earningsPeriod" TEXT,
ADD COLUMN     "earningsSummary" TEXT,
ADD COLUMN     "newsSummary" TEXT,
ADD COLUMN     "newsSummaryAt" TIMESTAMP(3);
