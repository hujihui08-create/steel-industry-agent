DELETE FROM users WHERE phone = '13800138000';
DELETE FROM mobile_roles WHERE name IN ('采购商', '供应商', '分析师') AND role_type = 'mobile';
