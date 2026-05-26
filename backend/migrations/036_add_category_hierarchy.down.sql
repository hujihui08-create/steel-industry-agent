ALTER TABLE categories DROP COLUMN IF EXISTS exchange;
ALTER TABLE categories DROP COLUMN IF EXISTS contract_code;
ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;
DROP INDEX IF EXISTS idx_categories_name_type_parent;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_type ON categories(name, type);
