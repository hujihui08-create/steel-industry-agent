CREATE TABLE IF NOT EXISTS crawler_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(100) NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    source_url VARCHAR(500) NOT NULL,
    crawl_rule JSONB,
    crawl_interval INTEGER DEFAULT 1800,
    is_active BOOLEAN DEFAULT true,
    last_crawl_at TIMESTAMP,
    last_success_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
