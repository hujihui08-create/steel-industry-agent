CREATE TABLE IF NOT EXISTS login_logs (
    id SERIAL PRIMARY KEY,
    user_type VARCHAR(20) NOT NULL,
    admin_id INT,
    user_id INT,
    login_type VARCHAR(20) NOT NULL,
    fail_reason VARCHAR(255) DEFAULT '',
    ip_address VARCHAR(50) DEFAULT '',
    user_agent VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_type_created ON login_logs(user_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_admin_id_created ON login_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id_created ON login_logs(user_id, created_at DESC);
