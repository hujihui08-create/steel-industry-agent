CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    parent_id INT,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50) DEFAULT '',
    path VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    visible_roles VARCHAR(200) DEFAULT 'super_admin,operator,data_admin,viewer',
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menus_parent_id ON menus(parent_id);
