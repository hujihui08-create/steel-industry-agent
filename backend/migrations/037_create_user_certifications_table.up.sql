CREATE TABLE IF NOT EXISTS user_certifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    company_name VARCHAR(100) NOT NULL,
    credit_code VARCHAR(18) NOT NULL,
    contact_name VARCHAR(20) NOT NULL,
    contact_phone VARCHAR(11) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    remark TEXT,
    reviewed_by INTEGER,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_certifications_user_id ON user_certifications(user_id);
CREATE INDEX idx_user_certifications_status ON user_certifications(status);
