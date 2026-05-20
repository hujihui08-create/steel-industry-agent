CREATE TABLE IF NOT EXISTS token_usages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_id VARCHAR(64),
    model VARCHAR(50),
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_usages_user_id ON token_usages(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usages_created_at ON token_usages(created_at);
