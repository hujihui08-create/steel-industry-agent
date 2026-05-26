CREATE TABLE IF NOT EXISTS api_call_logs (
    id SERIAL PRIMARY KEY,
    api_path VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER DEFAULT 0,
    user_id INTEGER,
    ip_address VARCHAR(50) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_call_logs_path_date ON api_call_logs(api_path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_created_at ON api_call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_call_logs_user_date ON api_call_logs(user_id, created_at DESC);
