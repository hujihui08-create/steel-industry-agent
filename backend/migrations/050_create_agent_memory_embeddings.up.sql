CREATE TABLE agent_memory_embeddings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_memory_embeddings_user_id ON agent_memory_embeddings(user_id);
CREATE INDEX idx_agent_memory_embeddings_embedding ON agent_memory_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
