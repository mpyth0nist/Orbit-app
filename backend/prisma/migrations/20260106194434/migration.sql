-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "Follow" ALTER COLUMN "status" SET DEFAULT 'ACCEPTED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "type" "AccountType" NOT NULL DEFAULT 'PUBLIC';
