CREATE TABLE IF NOT EXISTS entity_configs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_value VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_configs_type ON entity_configs(entity_type);

INSERT INTO entity_configs (entity_type, entity_value) VALUES
    ('region', '上海'),
    ('region', '北京'),
    ('region', '广州'),
    ('region', '深圳'),
    ('region', '杭州'),
    ('region', '南京'),
    ('region', '武汉'),
    ('region', '成都'),
    ('region', '重庆'),
    ('region', '天津');
