CREATE TABLE IF NOT EXISTS tenders (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    region VARCHAR(50),
    category VARCHAR(50),
    budget DECIMAL(14,2),
    deadline TIMESTAMP,
    bid_deadline TIMESTAMP,
    status VARCHAR(20) DEFAULT 'open',
    source_url VARCHAR(500),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_region ON tenders(region);
CREATE INDEX IF NOT EXISTS idx_tenders_category ON tenders(category);
