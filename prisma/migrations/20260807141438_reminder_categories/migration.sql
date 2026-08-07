/*
  Warnings:

  - Added the required column `categoryId` to the `Reminder` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "categoryId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ReminderCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReminderCategory_userId_name_key" ON "ReminderCategory"("userId", "name");

-- AddForeignKey
ALTER TABLE "ReminderCategory" ADD CONSTRAINT "ReminderCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ReminderCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
