-- AlterTable
ALTER TABLE "User" ADD COLUMN     "topStoriesCountry" TEXT,
ADD COLUMN     "topStoriesSummary" TEXT,
ADD COLUMN     "topStoriesSummaryAt" TIMESTAMP(3);
