ALTER TABLE knowledge_base
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS vector_id,
    DROP COLUMN IF EXISTS chunk_count;
