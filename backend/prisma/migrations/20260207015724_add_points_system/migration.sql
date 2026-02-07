-- CreateEnum
CREATE TYPE "ThreadType" AS ENUM ('NORMAL', 'HELP');

-- CreateEnum
CREATE TYPE "HelpType" AS ENUM ('HELPFUL', 'BIG_HELP');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'HELP_MARK';

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "help_type" "HelpType";

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "thread_type" "ThreadType" NOT NULL DEFAULT 'NORMAL';

-- CreateTable
CREATE TABLE "tiers" (
    "id" SERIAL NOT NULL,
    "tier" VARCHAR(20) NOT NULL,
    "min_points" INTEGER NOT NULL,

    CONSTRAINT "tiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Profile_points_idx" ON "Profile"("points" DESC);
