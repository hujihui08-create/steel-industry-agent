DELETE FROM mobile_roles WHERE role_type = 'admin';
ALTER TABLE mobile_roles DROP COLUMN role_type;