CREATE TABLE agent_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    key VARCHAR(200) NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW(),
    accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_memories_user_id ON agent_memories(user_id);
CREATE INDEX idx_agent_memories_user_key ON agent_memories(user_id, key);
CREATE INDEX idx_agent_memories_accessed_at ON agent_memories(accessed_at);
