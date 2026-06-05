-- 045_seed_crawler_sources.down.sql
-- 回滚：删除预配置的爬虫数据源种子数据

DELETE FROM crawler_sources
WHERE source_url IN (
    'https://www.mysteel.com/',
    'https://www.csteelnews.com/',
    'https://www.mysteel.com/news',
    'https://www.bidcenter.com.cn/',
    'https://www.gangguan.org/'
);

-- 删除 source_url 唯一索引
DROP INDEX IF EXISTS idx_crawler_sources_source_url;
