/*
  Warnings:

  - You are about to drop the column `completedAt` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `coverImagePublicId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `coverImageUrl` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `isPublished` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `Project` table. All the data in the column will be lost.
  - You are about to alter the column `contractValue` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to drop the column `caption` on the `ProjectImage` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `ProjectImage` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `ProjectImage` table. All the data in the column will be lost.
  - Added the required column `url` to the `ProjectImage` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Project_category_idx";

-- DropIndex
DROP INDEX "Project_isPublished_idx";

-- DropIndex
DROP INDEX "Project_state_idx";

-- DropIndex
DROP INDEX "Project_status_idx";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "completedAt",
DROP COLUMN "coverImagePublicId",
DROP COLUMN "coverImageUrl",
DROP COLUMN "isPublished",
DROP COLUMN "order",
DROP COLUMN "state",
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TIMESTAMP(3),
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "contractValue" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "ProjectImage" DROP COLUMN "caption",
DROP COLUMN "imageUrl",
DROP COLUMN "order",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "url" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "ProjectVideo" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "duration" DOUBLE PRECISION,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectVideo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectVideo_projectId_idx" ON "ProjectVideo"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectVideo" ADD CONSTRAINT "ProjectVideo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
