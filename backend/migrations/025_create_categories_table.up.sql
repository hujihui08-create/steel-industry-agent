CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'spot',
    status VARCHAR(20) NOT NULL DEFAULT 'enabled',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_type ON categories(name, type);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);

INSERT INTO categories (name, type, status, sort_order) VALUES
('螺纹钢', 'spot', 'enabled', 1),
('热卷', 'spot', 'enabled', 2),
('冷轧', 'spot', 'enabled', 3),
('中厚板', 'spot', 'enabled', 4),
('镀锌板', 'spot', 'enabled', 5),
('彩涂板', 'spot', 'enabled', 6),
('不锈钢', 'spot', 'enabled', 7),
('型钢', 'spot', 'enabled', 8),
('管材', 'spot', 'enabled', 9)
ON CONFLICT (name, type) DO NOTHING;
