CREATE TABLE IF NOT EXISTS crawler_logs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES crawler_sources(id),
    status VARCHAR(20) NOT NULL,
    items_crawled INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_crawler_logs_source ON crawler_logs(source_id, started_at DESC);
