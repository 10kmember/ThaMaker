-- Portraits publish on upload rather than waiting in a queue.
--
-- The review columns keep doing a job, but the opposite one: they used to
-- record that somebody let an image through, and now they record that somebody
-- took one down. Renaming them rather than dropping and re-adding keeps the
-- history of every portrait already refused.
ALTER TABLE "CreatorPortrait" RENAME COLUMN "reviewedAt" TO "withdrawnAt";
ALTER TABLE "CreatorPortrait" RENAME COLUMN "reviewedById" TO "withdrawnById";
ALTER TABLE "CreatorPortrait" RENAME COLUMN "rejectionReason" TO "withdrawnReason";

-- Two states where there were three. Anything already approved stays up;
-- anything refused becomes a withdrawal, which is what a refusal now is; and
-- anything still waiting in the queue when this ran goes live, because there
-- is no longer a queue for it to wait in.
CREATE TYPE "PortraitStatus_new" AS ENUM ('published', 'withdrawn');

ALTER TABLE "CreatorPortrait" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "CreatorPortrait"
  ALTER COLUMN "status" TYPE "PortraitStatus_new"
  USING (CASE WHEN "status" = 'rejected' THEN 'withdrawn' ELSE 'published' END)::"PortraitStatus_new";

ALTER TYPE "PortraitStatus" RENAME TO "PortraitStatus_old";
ALTER TYPE "PortraitStatus_new" RENAME TO "PortraitStatus";
DROP TYPE "PortraitStatus_old";

ALTER TABLE "CreatorPortrait" ALTER COLUMN "status" SET DEFAULT 'published';

-- A portrait that was pending has bytes but no serving path, because the path
-- was written by the approval that never came. Write it now, or those records
-- would show the PALMA plate over an image the database is holding.
UPDATE "Creator" AS c
SET "portraitUrl" = '/creators/' || c."slug" || '/portrait/' || p."checksum",
    "portraitAlt" = p."alt"
FROM "CreatorPortrait" AS p
WHERE p."creatorId" = c."id"
  AND p."status" = 'published'
  AND p."byteSize" > 0
  AND c."portraitUrl" IS NULL;
