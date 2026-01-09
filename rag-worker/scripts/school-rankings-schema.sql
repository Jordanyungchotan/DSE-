-- 中学排名数据表
-- 来源: https://www.notesity.hk/pages/blog-secondary-school-ranking

-- 全港中学排名表（Top 100）
CREATE TABLE IF NOT EXISTS hk_school_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rank INTEGER NOT NULL,                    -- 全港排名
    name_zh TEXT NOT NULL,                    -- 中文名称
    name_en TEXT,                             -- 英文名称
    gender TEXT DEFAULT 'coed',               -- 性别类型: coed(男女校), boys(男校), girls(女校)
    school_type TEXT,                         -- 学校类型: government(官立), aided(资助), dss(直资), private(私立)
    district TEXT,                            -- 所属区域
    banding TEXT DEFAULT 'Band 1',            -- 组别: Band 1, Band 2, Band 3
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name_zh)
);

-- 各区中学排名表
CREATE TABLE IF NOT EXISTS hk_district_school_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    district TEXT NOT NULL,                   -- 区域名称
    rank INTEGER NOT NULL,                    -- 区内排名
    name_zh TEXT NOT NULL,                    -- 中文名称
    name_en TEXT,                             -- 英文名称
    gender TEXT DEFAULT 'coed',               -- 性别类型
    school_type TEXT,                         -- 学校类型
    banding TEXT DEFAULT 'Band 1',            -- 组别（区内前10一般都是Band 1）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(district, name_zh)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_school_rankings_rank ON hk_school_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_school_rankings_district ON hk_school_rankings(district);
CREATE INDEX IF NOT EXISTS idx_school_rankings_type ON hk_school_rankings(school_type);
CREATE INDEX IF NOT EXISTS idx_school_rankings_gender ON hk_school_rankings(gender);

CREATE INDEX IF NOT EXISTS idx_district_rankings_district ON hk_district_school_rankings(district);
CREATE INDEX IF NOT EXISTS idx_district_rankings_rank ON hk_district_school_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_district_rankings_name ON hk_district_school_rankings(name_zh);
