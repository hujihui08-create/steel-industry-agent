CREATE TABLE IF NOT EXISTS quotations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    customer_name VARCHAR(100),
    category VARCHAR(50) NOT NULL,
    spec VARCHAR(100) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20),
    material_cost DECIMAL(12,2),
    process_cost DECIMAL(12,2),
    freight_cost DECIMAL(12,2),
    tax_cost DECIMAL(12,2),
    total_price DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotations_user_id ON quotations(user_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
