-- AlterTable
ALTER TABLE "public"."Species" ADD COLUMN     "family" TEXT,
ADD COLUMN     "gbifKey" INTEGER,
ADD COLUMN     "inaturalistTaxonId" INTEGER,
ADD COLUMN     "synonyms" JSONB;

-- CreateTable
CREATE TABLE "public"."SpeciesPhoto" (
    "id" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "license" TEXT,
    "attribution" TEXT,
    "source" TEXT NOT NULL DEFAULT 'INATURALIST',
    "rank" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeciesPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpeciesPhoto_speciesId_idx" ON "public"."SpeciesPhoto"("speciesId");

-- AddForeignKey
ALTER TABLE "public"."SpeciesPhoto" ADD CONSTRAINT "SpeciesPhoto_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "public"."Species"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
