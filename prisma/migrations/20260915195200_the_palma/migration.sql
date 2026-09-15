-- AlterEnum
--
-- On its own, deliberately. Postgres refuses to use a new enum value in the
-- same transaction that adds it, so the index and constraint that reference
-- 'the_palma' live in the migration that follows this one.
ALTER TYPE "HonourKind" ADD VALUE 'the_palma';

-- AlterTable
--
-- Null for THE PALMA only; the check constraint in the next migration is what
-- holds that to exactly one kind of honour.
ALTER TABLE "Honour" ALTER COLUMN "categoryId" DROP NOT NULL;
