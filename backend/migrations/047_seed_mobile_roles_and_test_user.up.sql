-- Seed mobile roles for mobile app users
INSERT INTO mobile_roles (name, description, permissions, status, role_type, created_at, updated_at)
SELECT '采购商', '钢材采购人员，可查询价格、计算报价、搜索知识、查看招标', '{"view_price":true,"price_trend":true,"calc_quotation":true,"query_tender":true,"search_knowledge":true,"query_standard":true,"compare_grade":true,"query_term":true,"calc_weight":true,"convert_unit":true,"set_alert":true,"ai_chat":true,"export_quotation":true,"export_report":true}', 1, 'mobile', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM mobile_roles WHERE name = '采购商' AND role_type = 'mobile');

INSERT INTO mobile_roles (name, description, permissions, status, role_type, created_at, updated_at)
SELECT '供应商', '钢材供应商，可查看价格行情、管理报价单', '{"view_price":true,"price_trend":true,"calc_quotation":true,"query_tender":true,"search_knowledge":true,"query_standard":true,"compare_grade":true,"query_term":true,"calc_weight":true,"convert_unit":true,"set_alert":true,"ai_chat":true,"export_quotation":true,"export_report":true}', 1, 'mobile', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM mobile_roles WHERE name = '供应商' AND role_type = 'mobile');

INSERT INTO mobile_roles (name, description, permissions, status, role_type, created_at, updated_at)
SELECT '分析师', '行业分析师，可查看行情走势、获取数据报告', '{"view_price":true,"price_trend":true,"calc_quotation":true,"query_tender":true,"search_knowledge":true,"query_standard":true,"compare_grade":true,"query_term":true,"calc_weight":true,"convert_unit":true,"set_alert":true,"ai_chat":true,"export_quotation":true,"export_report":true}', 1, 'mobile', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM mobile_roles WHERE name = '分析师' AND role_type = 'mobile');

-- Seed a test user (phone: 13800138000, password: 123456)
-- bcrypt hash for '123456' with cost 10
INSERT INTO users (phone, password_hash, nickname, company, role, role_id, region, status, is_verified, created_at, updated_at)
SELECT 
    '13800138000',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    '测试用户',
    '测试钢铁公司',
    'buyer',
    (SELECT id FROM mobile_roles WHERE name = '采购商' AND role_type = 'mobile' LIMIT 1),
    '上海',
    1,
    true,
    NOW(),
    NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE phone = '13800138000');
