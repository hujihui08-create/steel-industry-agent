CREATE TABLE IF NOT EXISTS user_feedbacks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    contact VARCHAR(100),
    status VARCHAR(20) DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_feedbacks_user_id ON user_feedbacks(user_id);
CREATE INDEX idx_user_feedbacks_type ON user_feedbacks(type);
