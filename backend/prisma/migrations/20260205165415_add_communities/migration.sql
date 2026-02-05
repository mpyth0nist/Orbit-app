/*
  Warnings:

  - You are about to drop the `Hashtag` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CommunityRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'BANNED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REPOST';

-- DropForeignKey
ALTER TABLE "_ThreadHashtags" DROP CONSTRAINT "_ThreadHashtags_A_fkey";

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "community_id" INTEGER,
ADD COLUMN     "is_pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "repost_id" INTEGER,
ADD COLUMN     "reposts_count" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "Hashtag";

-- CreateTable
CREATE TABLE "hashtags" (
    "id" SERIAL NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "use_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_threads" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "thread_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "photo_url" VARCHAR(255),
    "creator_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityMember" (
    "id" SERIAL NOT NULL,
    "community_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" "CommunityRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hashtags_tag_key" ON "hashtags"("tag");

-- CreateIndex
CREATE INDEX "hashtags_tag_idx" ON "hashtags"("tag");

-- CreateIndex
CREATE INDEX "hashtags_use_count_idx" ON "hashtags"("use_count" DESC);

-- CreateIndex
CREATE INDEX "saved_threads_user_id_idx" ON "saved_threads"("user_id");

-- CreateIndex
CREATE INDEX "saved_threads_thread_id_idx" ON "saved_threads"("thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_threads_user_id_thread_id_key" ON "saved_threads"("user_id", "thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "Community_name_key" ON "Community"("name");

-- CreateIndex
CREATE INDEX "Community_name_idx" ON "Community"("name");

-- CreateIndex
CREATE INDEX "Community_creator_id_idx" ON "Community"("creator_id");

-- CreateIndex
CREATE INDEX "CommunityMember_community_id_idx" ON "CommunityMember"("community_id");

-- CreateIndex
CREATE INDEX "CommunityMember_user_id_idx" ON "CommunityMember"("user_id");

-- CreateIndex
CREATE INDEX "CommunityMember_community_id_status_idx" ON "CommunityMember"("community_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityMember_community_id_user_id_key" ON "CommunityMember"("community_id", "user_id");

-- CreateIndex
CREATE INDEX "Thread_community_id_idx" ON "Thread"("community_id");

-- CreateIndex
CREATE INDEX "Thread_community_id_is_pinned_idx" ON "Thread"("community_id", "is_pinned");

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_repost_id_fkey" FOREIGN KEY ("repost_id") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ThreadHashtags" ADD CONSTRAINT "_ThreadHashtags_A_fkey" FOREIGN KEY ("A") REFERENCES "hashtags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "saved_threads" ADD CONSTRAINT "saved_threads_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_threads" ADD CONSTRAINT "saved_threads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Community" ADD CONSTRAINT "Community_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "Community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityMember" ADD CONSTRAINT "CommunityMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
