ALTER TABLE admins ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP NULL;
ALTER TABLE admins ALTER COLUMN role SET DEFAULT 'operator';
CREATE INDEX IF NOT EXISTS idx_admins_locked_until ON admins(locked_until);
