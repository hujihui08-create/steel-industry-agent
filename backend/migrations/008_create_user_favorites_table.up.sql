CREATE TABLE IF NOT EXISTS user_favorites (
    user_id INTEGER NOT NULL,
    tender_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, tender_id)
);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
