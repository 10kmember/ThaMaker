-- CreateTable
CREATE TABLE "ProductEntry" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "verdict" INTEGER,
    "bestFor" TEXT NOT NULL,
    "strengths" TEXT[],
    "limitations" TEXT[],
    "review" TEXT NOT NULL,
    "testedBy" TEXT,
    "externalUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "sponsorId" TEXT,
    "sponsorDisclosure" TEXT,
    "sponsoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "ProductEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductEntry_slug_key" ON "ProductEntry"("slug");

-- CreateIndex
CREATE INDEX "ProductEntry_isPublished_category_idx" ON "ProductEntry"("isPublished", "category");

-- CreateIndex
CREATE INDEX "ProductEntry_sponsorId_idx" ON "ProductEntry"("sponsorId");

-- AddForeignKey
ALTER TABLE "ProductEntry" ADD CONSTRAINT "ProductEntry_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
