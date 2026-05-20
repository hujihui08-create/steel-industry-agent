CREATE TABLE IF NOT EXISTS news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    summary VARCHAR(500) DEFAULT '',
    content TEXT,
    source VARCHAR(100) DEFAULT '',
    source_url VARCHAR(500) DEFAULT '',
    category VARCHAR(50) DEFAULT '',
    published_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE news ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at);
