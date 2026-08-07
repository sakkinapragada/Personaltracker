-- CreateTable
CREATE TABLE "Stock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "shares" DOUBLE PRECISION,
    "avgCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Stock_userId_symbol_key" ON "Stock"("userId", "symbol");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
