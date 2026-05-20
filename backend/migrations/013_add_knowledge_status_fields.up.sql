ALTER TABLE knowledge_base
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS vector_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS chunk_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON knowledge_base(status);
