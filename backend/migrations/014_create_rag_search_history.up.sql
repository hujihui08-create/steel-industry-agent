CREATE TABLE IF NOT EXISTS rag_search_history (
    id SERIAL PRIMARY KEY,
    query VARCHAR(500) NOT NULL,
    top_k INTEGER NOT NULL DEFAULT 5,
    threshold REAL NOT NULL DEFAULT 0.7,
    result_count INTEGER NOT NULL DEFAULT 0,
    duration_ms BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_search_history_created_at ON rag_search_history(created_at DESC);
