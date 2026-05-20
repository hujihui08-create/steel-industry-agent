-- 汇总表加速对话主界面加载
CREATE TABLE IF NOT EXISTS steel_prices_latest (
    category VARCHAR(50) PRIMARY KEY,
    spec VARCHAR(100),
    region VARCHAR(50),
    price DECIMAL(10,2),
    change DECIMAL(10,2),
    change_pct DECIMAL(5,2),
    source VARCHAR(50),
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_query ON steel_prices (category, region, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_tender_search ON tenders USING GIN (to_tsvector('simple', title || ' ' || description));
