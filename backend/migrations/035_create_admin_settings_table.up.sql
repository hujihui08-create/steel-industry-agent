CREATE TABLE IF NOT EXISTS admin_settings (
    id SERIAL PRIMARY KEY,
    settings_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
