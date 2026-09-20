/*
  Warnings:

  - You are about to drop the column `description` on the `ProjectImage` table. All the data in the column will be lost.
  - You are about to drop the column `displayOrder` on the `ProjectImage` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `ProjectImage` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ProjectVideo` table. All the data in the column will be lost.
  - You are about to drop the column `displayOrder` on the `ProjectVideo` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `ProjectVideo` table. All the data in the column will be lost.
  - Added the required column `imageUrl` to the `ProjectImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoUrl` to the `ProjectVideo` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProjectImage" DROP COLUMN "description",
DROP COLUMN "displayOrder",
DROP COLUMN "url",
ADD COLUMN     "caption" TEXT,
ADD COLUMN     "imageUrl" TEXT NOT NULL,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProjectVideo" DROP COLUMN "description",
DROP COLUMN "displayOrder",
DROP COLUMN "url",
ADD COLUMN     "caption" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "videoUrl" TEXT NOT NULL;
