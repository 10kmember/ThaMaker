-- CreateTable
CREATE TABLE "PageCount" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "surface" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PageCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchCount" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "results" INTEGER,

    CONSTRAINT "SearchCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageCount_day_idx" ON "PageCount"("day");

-- CreateIndex
CREATE INDEX "PageCount_surface_day_idx" ON "PageCount"("surface", "day");

-- CreateIndex
CREATE UNIQUE INDEX "PageCount_path_day_key" ON "PageCount"("path", "day");

-- CreateIndex
CREATE INDEX "SearchCount_scope_day_idx" ON "SearchCount"("scope", "day");

-- CreateIndex
CREATE UNIQUE INDEX "SearchCount_scope_term_day_key" ON "SearchCount"("scope", "term", "day");
