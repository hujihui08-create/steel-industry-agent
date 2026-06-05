-- 045_seed_crawler_sources.down.sql
-- 删除种子数据源

DELETE FROM crawler_sources WHERE source_url IN (
    'https://www.mysteel.com/',
    'https://www.steelhome.cn/',
    'https://www.100ppi.com/',
    'https://www.bidcenter.com.cn/'
);

DROP INDEX IF EXISTS idx_crawler_sources_source_url;
