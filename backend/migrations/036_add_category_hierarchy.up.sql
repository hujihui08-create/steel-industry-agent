-- 新增品类层级字段
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INT REFERENCES categories(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS contract_code VARCHAR(20);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS exchange VARCHAR(30);

-- 重建唯一索引 (name, type, parent_id) — NULLS NOT DISTINCT
DROP INDEX IF EXISTS idx_categories_name_type;
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_type_parent ON categories(name, type, COALESCE(parent_id, 0));

-- 插入品类 "钢铁" (spot), 获取其ID后更新子品种的parent_id
-- 使用 DO block 动态处理
DO $$
DECLARE
    steel_id INT;
BEGIN
    INSERT INTO categories (name, type, status, sort_order) 
    VALUES ('钢铁', 'spot', 'enabled', 0)
    ON CONFLICT (name, type, COALESCE(parent_id, 0)) DO NOTHING
    RETURNING id INTO steel_id;
    
    IF steel_id IS NULL THEN
        SELECT id INTO steel_id FROM categories WHERE name = '钢铁' AND type = 'spot' AND parent_id IS NULL;
    END IF;
    
    -- 更新现有9个品种的parent_id指向钢铁
    UPDATE categories 
    SET parent_id = steel_id, sort_order = sort_order 
    WHERE parent_id IS NULL AND name IN ('螺纹钢','热卷','冷轧','中厚板','镀锌板','彩涂板','不锈钢','型钢','管材') AND type = 'spot';
END $$;
