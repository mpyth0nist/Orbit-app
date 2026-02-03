-- CreateTable
CREATE TABLE "Hashtag" (
    "id" SERIAL NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "use_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ThreadHashtags" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Hashtag_tag_key" ON "Hashtag"("tag");

-- CreateIndex
CREATE INDEX "Hashtag_tag_idx" ON "Hashtag"("tag");

-- CreateIndex
CREATE INDEX "Hashtag_use_count_idx" ON "Hashtag"("use_count");

-- CreateIndex
CREATE UNIQUE INDEX "_ThreadHashtags_AB_unique" ON "_ThreadHashtags"("A", "B");

-- CreateIndex
CREATE INDEX "_ThreadHashtags_B_index" ON "_ThreadHashtags"("B");

-- AddForeignKey
ALTER TABLE "_ThreadHashtags" ADD CONSTRAINT "_ThreadHashtags_A_fkey" FOREIGN KEY ("A") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "_ThreadHashtags" ADD CONSTRAINT "_ThreadHashtags_B_fkey" FOREIGN KEY ("B") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AlterTable
ALTER TABLE "Thread" ADD COLUMN "search_vector" tsvector;

-- CreateIndex
CREATE INDEX "thread_search_idx" ON "Thread" USING GIN ("search_vector");
