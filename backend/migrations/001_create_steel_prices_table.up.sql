CREATE TABLE IF NOT EXISTS steel_prices (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    spec VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    change DECIMAL(10,2),
    change_pct DECIMAL(5,2),
    region VARCHAR(50) NOT NULL,
    source VARCHAR(50),
    price_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_steel_prices_category ON steel_prices(category);
CREATE INDEX IF NOT EXISTS idx_steel_prices_region ON steel_prices(region);
CREATE INDEX IF NOT EXISTS idx_steel_prices_price_date ON steel_prices(price_date);
