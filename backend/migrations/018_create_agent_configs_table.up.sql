CREATE TABLE IF NOT EXISTS agent_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO agent_configs (config_key, config_value, description) VALUES
('system_prompt', '{"content": "你是钢铁行业专业助手..."}', '系统提示词'),
('model_config', '{"model": "gpt-4o-mini", "temperature": 0.1, "max_tokens": 2000}', 'AI模型配置')
ON CONFLICT (config_key) DO NOTHING;
