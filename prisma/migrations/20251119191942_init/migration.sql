-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ROUTING', 'BUILDING', 'SUBMITTED', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('MARKET', 'LIMIT', 'SNIPER');

-- CreateEnum
CREATE TYPE "DexType" AS ENUM ('RAYDIUM', 'METEORA');

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "fromToken" TEXT NOT NULL,
    "toToken" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "selectedDex" "DexType",
    "raydiumPrice" DOUBLE PRECISION,
    "meteoraPrice" DOUBLE PRECISION,
    "executionPrice" DOUBLE PRECISION,
    "txHash" TEXT,
    "slippageTolerance" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
