-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "coinId" TEXT NOT NULL,
    "coinName" TEXT NOT NULL,
    "targetPrice" DECIMAL(24,8) NOT NULL,
    "direction" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
