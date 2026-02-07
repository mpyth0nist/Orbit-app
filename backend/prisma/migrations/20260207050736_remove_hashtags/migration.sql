/*
  Warnings:

  - You are about to drop the `_ThreadHashtags` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `hashtags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ThreadHashtags" DROP CONSTRAINT "_ThreadHashtags_A_fkey";

-- DropForeignKey
ALTER TABLE "_ThreadHashtags" DROP CONSTRAINT "_ThreadHashtags_B_fkey";

-- DropTable
DROP TABLE "_ThreadHashtags";

-- DropTable
DROP TABLE "hashtags";
