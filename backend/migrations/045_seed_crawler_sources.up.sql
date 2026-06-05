-- 045_seed_crawler_sources.up.sql
-- 预配置爬虫数据源种子数据

-- 添加 source_url 唯一索引，支持 ON CONFLICT DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS idx_crawler_sources_source_url ON crawler_sources(source_url);

-- 1. 我的钢铁网 - 价格
INSERT INTO crawler_sources (source_name, source_type, source_url, crawl_rule, crawl_interval, is_active)
VALUES (
    '我的钢铁网-价格',
    'price',
    'https://www.mysteel.com/',
    '{
        "container": "table tr",
        "fields": {
            "category": "td:nth-child(1)",
            "spec": "td:nth-child(2)",
            "price": "td:nth-child(3)",
            "change": "td:nth-child(4)",
            "change_pct": "td:nth-child(5)",
            "region": "td:nth-child(6)"
        }
    }'::jsonb,
    1800,
    false
) ON CONFLICT (source_url) DO NOTHING;

-- 2. 中国钢铁新闻网 - 价格
INSERT INTO crawler_sources (source_name, source_type, source_url, crawl_rule, crawl_interval, is_active)
VALUES (
    '中国钢铁新闻网-价格',
    'price',
    'https://www.csteelnews.com/',
    '{
        "container": ".price-list li",
        "fields": {
            "category": ".category",
            "spec": ".spec",
            "price": ".price",
            "region": ".region"
        }
    }'::jsonb,
    1800,
    false
) ON CONFLICT (source_url) DO NOTHING;

-- 3. 我的钢铁网 - 资讯
INSERT INTO crawler_sources (source_name, source_type, source_url, crawl_rule, crawl_interval, is_active)
VALUES (
    '我的钢铁网-资讯',
    'news',
    'https://www.mysteel.com/news',
    '{
        "container": ".news-item",
        "fields": {
            "title": ".title",
            "summary": ".summary",
            "category": ".category"
        }
    }'::jsonb,
    1800,
    false
) ON CONFLICT (source_url) DO NOTHING;

-- 4. 中国招标网 - 招标
INSERT INTO crawler_sources (source_name, source_type, source_url, crawl_rule, crawl_interval, is_active)
VALUES (
    '中国招标网-招标',
    'tender',
    'https://www.bidcenter.com.cn/',
    '{
        "container": ".tender-item",
        "fields": {
            "title": ".title",
            "region": ".region",
            "category": ".category",
            "budget": ".budget",
            "description": ".description",
            "deadline": ".deadline"
        }
    }'::jsonb,
    1800,
    false
) ON CONFLICT (source_url) DO NOTHING;

-- 5. 钢铁行业数据 - 通用备用
INSERT INTO crawler_sources (source_name, source_type, source_url, crawl_rule, crawl_interval, is_active)
VALUES (
    '钢铁行业数据-通用',
    'price',
    'https://www.gangguan.org/',
    '{
        "container": ".data-row",
        "fields": {
            "category": ".category",
            "spec": ".spec",
            "price": ".price",
            "change": ".change",
            "region": ".region"
        }
    }'::jsonb,
    1800,
    false
) ON CONFLICT (source_url) DO NOTHING;
