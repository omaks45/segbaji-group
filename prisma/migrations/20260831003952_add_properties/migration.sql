-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL_PLOT', 'COMMERCIAL_LAND', 'INDUSTRIAL_LAND', 'ESTATE_PLOT', 'OTHER');

-- CreateEnum
CREATE TYPE "LandSizeUnit" AS ENUM ('ACRES', 'HECTARES', 'PLOTS');

-- CreateEnum
CREATE TYPE "LandCondition" AS ENUM ('DRY', 'WET', 'FENCED', 'GATED_ESTATE');

-- CreateEnum
CREATE TYPE "TitleType" AS ENUM ('C_OF_O', 'GOVERNORS_CONSENT', 'EXCISION', 'GOVERNMENT_ALLOCATION', 'DEED_OF_ASSIGNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyAvailabilityStatus" AS ENUM ('AVAILABLE', 'UNDER_OFFER', 'SOLD', 'DRAFT');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('TOTAL', 'PER_ACRE', 'PER_HECTARE', 'PER_PLOT');

-- CreateEnum
CREATE TYPE "NearbyPlaceType" AS ENUM ('SCHOOL', 'HOSPITAL', 'COMPANY_OFFICE', 'BRIDGE', 'FUEL_STATION', 'HIGHWAY');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "propertyType" "PropertyType" NOT NULL,
    "landSizeValue" DOUBLE PRECISION NOT NULL,
    "landSizeUnit" "LandSizeUnit" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceType" "PriceType" NOT NULL DEFAULT 'TOTAL',
    "isPriceNegotiable" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "landCondition" "LandCondition" NOT NULL,
    "titleType" "TitleType" NOT NULL,
    "availabilityStatus" "PropertyAvailabilityStatus" NOT NULL DEFAULT 'DRAFT',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "coverImageUrl" TEXT,
    "coverImagePublicId" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "hasVerifiedTitle" BOOLEAN NOT NULL DEFAULT false,
    "hasDryLand" BOOLEAN NOT NULL DEFAULT false,
    "hasGoodRoadNetwork" BOOLEAN NOT NULL DEFAULT false,
    "hasSecureEnvironment" BOOLEAN NOT NULL DEFAULT false,
    "hasElectricityNearby" BOOLEAN NOT NULL DEFAULT false,
    "hasDrainageSystem" BOOLEAN NOT NULL DEFAULT false,
    "hasSurveyPlan" BOOLEAN NOT NULL DEFAULT false,
    "isGovernmentApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyImage" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "caption" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyNearbyPlace" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "NearbyPlaceType" NOT NULL,
    "label" TEXT,
    "distanceOrTime" TEXT NOT NULL,

    CONSTRAINT "PropertyNearbyPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE INDEX "Property_state_idx" ON "Property"("state");

-- CreateIndex
CREATE INDEX "Property_availabilityStatus_idx" ON "Property"("availabilityStatus");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "PropertyImage_propertyId_idx" ON "PropertyImage"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyNearbyPlace_propertyId_idx" ON "PropertyNearbyPlace"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyNearbyPlace_propertyId_type_key" ON "PropertyNearbyPlace"("propertyId", "type");

-- AddForeignKey
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyNearbyPlace" ADD CONSTRAINT "PropertyNearbyPlace_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
