-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('QUOTE_REQUEST', 'CONTACT_MESSAGE', 'MANUAL');

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "convertedToClientId" TEXT;

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "convertedToClientId" TEXT;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "source" "ClientSource" NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_isActive_idx" ON "Client"("isActive");

-- CreateIndex
CREATE INDEX "ContactMessage_convertedToClientId_idx" ON "ContactMessage"("convertedToClientId");

-- CreateIndex
CREATE INDEX "QuoteRequest_convertedToClientId_idx" ON "QuoteRequest"("convertedToClientId");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_convertedToClientId_fkey" FOREIGN KEY ("convertedToClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactMessage" ADD CONSTRAINT "ContactMessage_convertedToClientId_fkey" FOREIGN KEY ("convertedToClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
