/*
  Warnings:

  - You are about to drop the column `message` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `last_update` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `public` on the `Profile` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Setting` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[follower_id,followed_id]` on the table `Follow` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,thread_id]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,comment_id]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updated_at` to the `Comment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actor_id` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiver_id` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `Thread` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('COMMENT', 'THREAD', 'USER');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FOLLOW_REQUEST';

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_thread_id_fkey";

-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followed_id_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_follower_id_fkey";

-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_thread_id_fkey";

-- DropForeignKey
ALTER TABLE "Media" DROP CONSTRAINT "Media_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_thread_id_fkey";

-- DropForeignKey
ALTER TABLE "Reaction" DROP CONSTRAINT "Reaction_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Setting" DROP CONSTRAINT "Setting_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Thread" DROP CONSTRAINT "Thread_user_id_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Follow" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Media" ALTER COLUMN "url" SET DATA TYPE VARCHAR(500);

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "message",
DROP COLUMN "user_id",
ADD COLUMN     "actor_id" INTEGER NOT NULL,
ADD COLUMN     "entity_id" INTEGER,
ADD COLUMN     "entity_type" "EntityType",
ADD COLUMN     "receiver_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Profile" DROP COLUMN "last_update",
DROP COLUMN "public",
ADD COLUMN     "first_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "last_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "comment_id" INTEGER,
ALTER COLUMN "thread_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "comments_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "likes_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "firstName",
DROP COLUMN "lastName",
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Setting";

-- CreateIndex
CREATE INDEX "Comment_thread_id_idx" ON "Comment"("thread_id");

-- CreateIndex
CREATE INDEX "Comment_user_id_idx" ON "Comment"("user_id");

-- CreateIndex
CREATE INDEX "Comment_parent_id_idx" ON "Comment"("parent_id");

-- CreateIndex
CREATE INDEX "Comment_thread_id_created_at_idx" ON "Comment"("thread_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Follow_follower_id_idx" ON "Follow"("follower_id");

-- CreateIndex
CREATE INDEX "Follow_followed_id_idx" ON "Follow"("followed_id");

-- CreateIndex
CREATE INDEX "Follow_follower_id_status_idx" ON "Follow"("follower_id", "status");

-- CreateIndex
CREATE INDEX "Follow_followed_id_status_idx" ON "Follow"("followed_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_follower_id_followed_id_key" ON "Follow"("follower_id", "followed_id");

-- CreateIndex
CREATE INDEX "Media_user_id_idx" ON "Media"("user_id");

-- CreateIndex
CREATE INDEX "Media_thread_id_idx" ON "Media"("thread_id");

-- CreateIndex
CREATE INDEX "Media_uploaded_at_idx" ON "Media"("uploaded_at" DESC);

-- CreateIndex
CREATE INDEX "Notification_receiver_id_idx" ON "Notification"("receiver_id");

-- CreateIndex
CREATE INDEX "Notification_actor_id_idx" ON "Notification"("actor_id");

-- CreateIndex
CREATE INDEX "Notification_receiver_id_is_read_idx" ON "Notification"("receiver_id", "is_read");

-- CreateIndex
CREATE INDEX "Notification_receiver_id_created_at_idx" ON "Notification"("receiver_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Profile_user_id_idx" ON "Profile"("user_id");

-- CreateIndex
CREATE INDEX "Reaction_user_id_idx" ON "Reaction"("user_id");

-- CreateIndex
CREATE INDEX "Reaction_thread_id_idx" ON "Reaction"("thread_id");

-- CreateIndex
CREATE INDEX "Reaction_comment_id_idx" ON "Reaction"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_user_id_thread_id_key" ON "Reaction"("user_id", "thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_user_id_comment_id_key" ON "Reaction"("user_id", "comment_id");

-- CreateIndex
CREATE INDEX "Thread_user_id_idx" ON "Thread"("user_id");

-- CreateIndex
CREATE INDEX "Thread_created_at_idx" ON "Thread"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Thread_user_id_created_at_idx" ON "Thread"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followed_id_fkey" FOREIGN KEY ("followed_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
