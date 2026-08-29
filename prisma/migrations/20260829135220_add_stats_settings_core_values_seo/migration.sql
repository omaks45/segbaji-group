-- CreateEnum
CREATE TYPE "PageKey" AS ENUM ('HOME', 'ABOUT', 'SERVICES', 'PROPERTIES', 'PROJECTS', 'CONTACT', 'QUOTE');

-- CreateTable
CREATE TABLE "SiteStat" (
    "id" TEXT NOT NULL,
    "yearsOfExperience" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearsOfExperienceSuffix" TEXT NOT NULL DEFAULT '+',
    "projectsCompleted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectsCompletedSuffix" TEXT NOT NULL DEFAULT '+',
    "clientSatisfactionRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clientSatisfactionSuffix" TEXT NOT NULL DEFAULT '/5',
    "skilledProfessionals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skilledProfessionalsSuffix" TEXT NOT NULL DEFAULT '+',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "officeAddress" TEXT,
    "phonePrimary" TEXT,
    "phoneSecondary" TEXT,
    "email" TEXT,
    "officeHours" TEXT,
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "twitterUrl" TEXT,
    "linkedinUrl" TEXT,
    "whatsappNumber" TEXT,
    "missionStatement" TEXT,
    "visionStatement" TEXT,
    "companyStory" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoreValue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoreValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMeta" (
    "id" TEXT NOT NULL,
    "pageKey" "PageKey" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeoMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SeoMeta_pageKey_key" ON "SeoMeta"("pageKey");
