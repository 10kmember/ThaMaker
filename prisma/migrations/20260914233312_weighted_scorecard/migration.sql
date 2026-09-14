/*
  Warnings:

  - You are about to drop the column `brand` on the `JudgingScore` table. All the data in the column will be lost.
  - You are about to drop the column `originality` on the `JudgingScore` table. All the data in the column will be lost.
  - You are about to drop the column `professionalism` on the `JudgingScore` table. All the data in the column will be lost.
  - Added the required column `achievement` to the `JudgingScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `audience` to the `JudgingScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fit` to the `JudgingScore` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quality` to the `JudgingScore` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JudgingScore" DROP COLUMN "brand",
DROP COLUMN "originality",
DROP COLUMN "professionalism",
ADD COLUMN     "achievement" INTEGER NOT NULL,
ADD COLUMN     "audience" INTEGER NOT NULL,
ADD COLUMN     "fit" INTEGER NOT NULL,
ADD COLUMN     "quality" INTEGER NOT NULL;
