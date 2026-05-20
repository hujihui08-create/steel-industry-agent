CREATE TABLE IF NOT EXISTS ai_feedbacks (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    is_helpful BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_message_id ON ai_feedbacks(message_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedbacks_user_id ON ai_feedbacks(user_id);
