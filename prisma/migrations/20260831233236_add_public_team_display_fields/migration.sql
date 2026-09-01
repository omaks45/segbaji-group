-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isPubliclyListed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "publicDisplayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publicDisplayTitle" TEXT;
