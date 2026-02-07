-- Create a function to update the search_vector
CREATE OR REPLACE FUNCTION update_thread_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that calls the function before INSERT or UPDATE
DROP TRIGGER IF EXISTS thread_search_vector_update ON "Thread";
CREATE TRIGGER thread_search_vector_update
    BEFORE INSERT OR UPDATE OF content
    ON "Thread"
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_search_vector();

-- Populate search_vector for existing threads
UPDATE "Thread"
SET search_vector = to_tsvector('english', COALESCE(content, ''))
WHERE search_vector IS NULL OR search_vector = ''::tsvector;