CREATE TABLE IF NOT EXISTS rag_config (
    id SERIAL PRIMARY KEY,
    embedding_model VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-small',
    chunk_method VARCHAR(20) NOT NULL DEFAULT 'paragraph',
    chunk_size INTEGER NOT NULL DEFAULT 512,
    chunk_overlap INTEGER NOT NULL DEFAULT 50,
    default_top_k INTEGER NOT NULL DEFAULT 5,
    default_threshold REAL NOT NULL DEFAULT 0.7,
    search_mode VARCHAR(20) NOT NULL DEFAULT 'hybrid',
    hybrid_weight REAL NOT NULL DEFAULT 0.7,
    query_rewrite_enabled BOOLEAN NOT NULL DEFAULT false,
    rerank_enabled BOOLEAN NOT NULL DEFAULT false,
    cache_enabled BOOLEAN NOT NULL DEFAULT false,
    max_recall INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default config row if table is empty
INSERT INTO rag_config (
    embedding_model, chunk_method, chunk_size, chunk_overlap,
    default_top_k, default_threshold, search_mode, hybrid_weight,
    query_rewrite_enabled, rerank_enabled, cache_enabled, max_recall
)
SELECT
    'text-embedding-3-small', 'paragraph', 512, 50,
    5, 0.7, 'hybrid', 0.7,
    false, false, false, 100
WHERE NOT EXISTS (SELECT 1 FROM rag_config);
