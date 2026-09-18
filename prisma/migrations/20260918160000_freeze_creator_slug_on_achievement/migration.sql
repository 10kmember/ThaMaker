-- The creator's slug becomes part of the sealed record.
--
-- The verification payload covers seven fields. Six were frozen onto the
-- Achievement row when the honour was issued; the seventh, the creator's slug,
-- was read live off the Creator row every time the page recomputed the
-- signature. So a slug that changed for any reason — a merge, a corrected
-- import, a hand-edit in a console — broke both the signature and the digest
-- on every honour that person held, and a broken digest is exactly what the
-- verify page reads as an altered record.
--
-- Backfilled from the current slug, which is correct: for every existing row
-- the current slug is what was signed, because nothing in the application has
-- ever changed one.
ALTER TABLE "Achievement" ADD COLUMN "creatorSlug" TEXT NOT NULL DEFAULT '';

UPDATE "Achievement" AS a
SET "creatorSlug" = c."slug"
FROM "Creator" AS c
WHERE c."id" = a."creatorId" AND a."creatorSlug" = '';
