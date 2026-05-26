ALTER TABLE token_usages DROP COLUMN IF EXISTS api_path;
ALTER TABLE token_usages DROP COLUMN IF EXISTS status_code;
ALTER TABLE token_usages DROP COLUMN IF EXISTS duration_ms;
