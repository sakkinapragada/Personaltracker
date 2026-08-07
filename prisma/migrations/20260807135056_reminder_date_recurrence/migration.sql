/*
  Warnings:

  - Added the required column `date` to the `Reminder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Recurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "recurrence" "Recurrence" NOT NULL DEFAULT 'DAILY';
