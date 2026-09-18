-- Portrait bytes can live outside the database.
--
-- `data` becomes nullable and `storageKey` appears beside it. Exactly one of
-- the two is set on any row: the bytes are in the column, or they are in R2
-- and the column holds the key. Existing rows keep their bytes and get a null
-- key, so nothing needs migrating and nothing changes for an installation
-- without object storage configured.
ALTER TABLE "CreatorPortrait" ALTER COLUMN "data" DROP NOT NULL;
ALTER TABLE "CreatorPortrait" ADD COLUMN "storageKey" TEXT;
