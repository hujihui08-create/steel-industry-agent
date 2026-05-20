CREATE TABLE IF NOT EXISTS intents (
    id SERIAL PRIMARY KEY,
    intent_code VARCHAR(50) UNIQUE NOT NULL,
    intent_name VARCHAR(100) NOT NULL,
    keywords TEXT[],
    reply_template TEXT,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_intents_code ON intents(intent_code);

CREATE TABLE IF NOT EXISTS bad_cases (
    id SERIAL PRIMARY KEY,
    user_query TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    correct_response TEXT,
    error_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    fix_solution TEXT,
    conversation_id INTEGER REFERENCES chat_sessions(id),
    reported_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    fixed_at TIMESTAMP,
    verified_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bad_cases_status ON bad_cases(status);
CREATE INDEX IF NOT EXISTS idx_bad_cases_error_type ON bad_cases(error_type);

CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    detail JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id, created_at DESC);
