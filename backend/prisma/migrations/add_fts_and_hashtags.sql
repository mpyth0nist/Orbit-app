-- Migration: Add Full-Text Search and Hashtag Support
-- Description: Adds search_vector column with GIN index for fast text search,
--              and creates hashtags table with many-to-many relation to threads

-- Step 1: Create hashtags table
CREATE TABLE IF NOT EXISTS "hashtags" (
  "id" SERIAL PRIMARY KEY,
  "tag" VARCHAR(100) UNIQUE NOT NULL,
  "use_count" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Step 2: Create junction table for Thread-Hashtag many-to-many
CREATE TABLE IF NOT EXISTS "_ThreadHashtags" (
  "A" INTEGER NOT NULL REFERENCES "hashtags"("id") ON DELETE CASCADE,
  "B" INTEGER NOT NULL REFERENCES "Thread"("id") ON DELETE CASCADE
);

-- Step 3: Create indexes for hashtags
CREATE INDEX IF NOT EXISTS "hashtags_tag_idx" ON "hashtags"("tag");
CREATE INDEX IF NOT EXISTS "hashtags_use_count_idx" ON "hashtags"("use_count" DESC);

-- Step 4: Create unique index on junction table
CREATE UNIQUE INDEX IF NOT EXISTS "_ThreadHashtags_AB_unique" ON "_ThreadHashtags"("A", "B");
CREATE INDEX IF NOT EXISTS "_ThreadHashtags_B_index" ON "_ThreadHashtags"("B");

-- Step 5: Add Full-Text Search column to Thread
ALTER TABLE "Thread" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Step 6: Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "thread_search_idx" ON "Thread" USING GIN("search_vector");

-- Step 7: Create function to update search_vector
CREATE OR REPLACE FUNCTION thread_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to auto-update search_vector on insert/update
DROP TRIGGER IF EXISTS thread_search_update ON "Thread";
CREATE TRIGGER thread_search_update
  BEFORE INSERT OR UPDATE OF content
  ON "Thread"
  FOR EACH ROW
  EXECUTE FUNCTION thread_search_trigger();

-- Step 9: Populate search_vector for existing threads
UPDATE "Thread" SET search_vector = to_tsvector('english', content) WHERE search_vector IS NULL;
