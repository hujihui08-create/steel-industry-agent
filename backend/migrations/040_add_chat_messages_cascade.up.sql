-- Drop any existing foreign key constraint on chat_messages.session_id
-- and recreate it with ON DELETE CASCADE so that deleting a chat session
-- automatically removes its associated messages.
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT tc.constraint_name INTO fk_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'chat_messages'
        AND kcu.column_name = 'session_id';

    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE chat_messages DROP CONSTRAINT ' || fk_name;
    END IF;
END $$;

ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;
