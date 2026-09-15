-- One THE PALMA a season, enforced by the database rather than by the code
-- that writes it.
--
-- The composite unique key on (awardYearId, categoryId, creatorId, kind)
-- cannot do this job: THE PALMA has no category, and Postgres treats NULLs as
-- distinct, so that key would happily accept a second one. This partial index
-- ignores category and creator entirely and says the only thing that matters,
-- which is that a season has at most one active PALMA. Revoking one frees the
-- season, which is the behaviour a revocation should have.
CREATE UNIQUE INDEX "Honour_the_palma_one_per_season"
  ON "Honour" ("awardYearId")
  WHERE "kind" = 'the_palma' AND "state" = 'active';

-- A PALMA is conferred on a career, not in a category. A row carrying both is
-- a category honour mislabelled, or THE PALMA misfiled, and either way the
-- public record would be wrong.
ALTER TABLE "Honour"
  ADD CONSTRAINT "Honour_the_palma_has_no_category"
  CHECK (
    ("kind" = 'the_palma' AND "categoryId" IS NULL)
    OR ("kind" <> 'the_palma' AND "categoryId" IS NOT NULL)
  );
