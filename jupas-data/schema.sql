-- JUPAS 课程计分公式表
-- 存储每个课程每年的具体计分规则

CREATE TABLE IF NOT EXISTS jupas_scoring_formulas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_code TEXT NOT NULL,             -- 课程代码 (JS5240)
  year INTEGER NOT NULL,                    -- 适用年份 (2025, 2024, etc.)
  
  -- 计分基础
  scoring_base TEXT NOT NULL,               -- 'best_5', 'best_6', '3core_2elec', 'best_5_include_eng_math', etc.
  include_english INTEGER DEFAULT 0,        -- 是否必须包含英文
  include_math INTEGER DEFAULT 0,           -- 是否必须包含数学
  include_specific TEXT,                    -- 其他必须包含的科目 JSON ["biology", "chemistry"]
  
  -- 科目加权 JSON: {"english": 2, "math": 2, "physics": 1.5, "other": 1}
  subject_weights TEXT,
  
  -- 第6科加分规则
  sixth_subject_bonus REAL DEFAULT 0,       -- 第6科加分系数
  bonus_cap REAL,                           -- 加分上限
  bonus_rules TEXT,                         -- 其他加分规则 JSON
  
  -- 分数换算表 (不同学校可能不同)
  -- 例如城大2025: {"5**": 8.5, "5*": 7, "5": 5.5, "4": 4, "3": 3, "2": 2, "1": 1}
  -- 传统换算: {"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}
  score_conversion TEXT,
  
  -- 收生成绩
  median REAL,                              -- 中位数
  lower_quartile REAL,                      -- 下四分位数
  upper_quartile REAL,                      -- 上四分位数
  
  -- 说明
  formula_description TEXT,                 -- 公式说明文字 (原文)
  notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(programme_code, year)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_scoring_programme ON jupas_scoring_formulas(programme_code);
CREATE INDEX IF NOT EXISTS idx_scoring_year ON jupas_scoring_formulas(year);

-- 大学分数换算配置表 (每个学校可能有不同的换算)
CREATE TABLE IF NOT EXISTS jupas_score_conversions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  university_code TEXT NOT NULL,            -- hku, cuhk, ust, cityu, etc.
  year INTEGER NOT NULL,                    -- 适用年份
  
  -- 分数换算 JSON
  -- {"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}
  conversion_table TEXT NOT NULL,
  
  -- Category B (Applied Learning) 换算
  category_b_conversion TEXT,
  
  -- Category C (Other Languages) 换算
  category_c_conversion TEXT,
  
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(university_code, year)
);

-- 插入基础换算配置
INSERT OR REPLACE INTO jupas_score_conversions (university_code, year, conversion_table, notes) VALUES
-- 传统换算 (大部分学校)
('default', 2025, '{"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}', '传统 DSE 分数换算'),
('default', 2024, '{"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}', '传统 DSE 分数换算'),
('default', 2023, '{"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}', '传统 DSE 分数换算'),
('default', 2022, '{"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}', '传统 DSE 分数换算'),
('default', 2021, '{"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}', '传统 DSE 分数换算'),

-- 城大 2025 新换算
('cityu', 2025, '{"5**": 8.5, "5*": 7, "5": 5.5, "4": 4, "3": 3, "2": 2, "1": 1}', '城大2025年起使用新换算'),

-- 港大使用4+2模式
('hku', 2025, '{"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}', 'HKU 4+2 模式'),
('hku', 2024, '{"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1}', 'HKU 4+2 模式');
