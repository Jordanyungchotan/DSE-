-- DSE分析系统数据库Schema
-- 用于 Cloudflare D1 或 SQLite 初始化

-- =====================
-- 基础表
-- =====================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 分析记录表
CREATE TABLE IF NOT EXISTS analysis_records (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  analysis_type TEXT DEFAULT 'transfer', -- 'transfer' | 'university'
  student_info TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================
-- 智能学校推荐相关表
-- =====================

-- 学生居住信息表
CREATE TABLE IF NOT EXISTS student_residence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  district TEXT NOT NULL, -- 香港18区
  address TEXT,
  max_commute_time INTEGER DEFAULT 60, -- 最大通勤时间(分钟)
  transport_preference TEXT DEFAULT 'public', -- 'public' | 'school_bus' | 'self'
  cross_district INTEGER DEFAULT 1, -- 是否考虑跨区 0/1
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学校偏好表
CREATE TABLE IF NOT EXISTS school_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  school_type TEXT DEFAULT 'coed', -- 'coed' | 'boys' | 'girls'
  religion_preference TEXT, -- 'catholic' | 'protestant' | 'buddhist' | 'none' | null
  extracurricular_importance INTEGER DEFAULT 3, -- 1-5级
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学校推荐记录表
CREATE TABLE IF NOT EXISTS school_recommendations (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  recommended_schools TEXT NOT NULL, -- JSON array
  recommendation_reasons TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES analysis_records(id) ON DELETE CASCADE
);

-- 香港中学数据表
CREATE TABLE IF NOT EXISTS hk_schools (
  id TEXT PRIMARY KEY,
  name_zh TEXT NOT NULL,
  name_en TEXT,
  district TEXT NOT NULL,
  school_type TEXT, -- 'coed' | 'boys' | 'girls'
  religion TEXT,
  funding_type TEXT, -- 'government' | 'aided' | 'dss' | 'private'
  banding INTEGER, -- 1-3
  dse_performance TEXT, -- JSON: 历年DSE表现
  address TEXT,
  latitude REAL,
  longitude REAL,
  facilities TEXT, -- JSON array
  extracurriculars TEXT, -- JSON array
  website TEXT,
  admission_info TEXT, -- JSON: 录取要求
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 大学申请分析相关表
-- =====================

-- 大学申请资料表
CREATE TABLE IF NOT EXISTS university_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  dse_results TEXT NOT NULL, -- JSON: 各科成绩
  best_five_score INTEGER, -- 最佳5科分数
  best_six_score INTEGER, -- 最佳6科分数
  target_universities TEXT, -- JSON array
  target_majors TEXT, -- JSON array
  extracurriculars TEXT, -- 课外活动
  leadership_experience TEXT, -- 领导经验
  volunteer_hours INTEGER, -- 志愿服务时数
  career_interests TEXT, -- JSON array
  expected_salary_range TEXT,
  work_location_preference TEXT,
  application_year INTEGER,
  need_scholarship INTEGER DEFAULT 0,
  consider_associate INTEGER DEFAULT 0, -- 是否考虑副学士
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 大学专业数据表
CREATE TABLE IF NOT EXISTS university_programs (
  id TEXT PRIMARY KEY,
  university_code TEXT NOT NULL, -- HKU, CUHK, UST, etc.
  university_name_zh TEXT NOT NULL,
  university_name_en TEXT NOT NULL,
  program_code TEXT,
  program_name_zh TEXT NOT NULL,
  program_name_en TEXT,
  category TEXT, -- 'business' | 'engineering' | 'science' | 'arts' | 'medicine' | etc.
  jupas_code TEXT,
  min_score_2024 INTEGER,
  median_score_2024 INTEGER,
  admission_rate REAL, -- 录取率
  interview_required INTEGER DEFAULT 0,
  special_requirements TEXT,
  career_prospects TEXT, -- JSON
  average_starting_salary INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 就业趋势数据表
CREATE TABLE IF NOT EXISTS employment_trends (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL,
  industry_zh TEXT NOT NULL,
  growth_rate REAL, -- 增长率 %
  average_salary INTEGER,
  entry_salary INTEGER,
  demand_level TEXT, -- 'high' | 'medium' | 'low'
  future_outlook TEXT, -- 'growing' | 'stable' | 'declining'
  ai_impact TEXT, -- 'positive' | 'neutral' | 'negative'
  required_skills TEXT, -- JSON array
  related_majors TEXT, -- JSON array
  data_source TEXT,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 用户收藏和对比
-- =====================

-- 收藏夹表
CREATE TABLE IF NOT EXISTS user_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'school' | 'university' | 'program'
  item_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================
-- 客户咨询表
-- =====================

-- 客户咨询记录表
CREATE TABLE IF NOT EXISTS customer_inquiries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'contacted' | 'resolved'
  notes TEXT, -- 管理员备注
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 索引
-- =====================

CREATE INDEX IF NOT EXISTS idx_analysis_user_id ON analysis_records(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON analysis_records(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON analysis_records(analysis_type);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_residence_user ON student_residence(user_id);
CREATE INDEX IF NOT EXISTS idx_residence_district ON student_residence(district);
CREATE INDEX IF NOT EXISTS idx_schools_district ON hk_schools(district);
CREATE INDEX IF NOT EXISTS idx_schools_banding ON hk_schools(banding);
CREATE INDEX IF NOT EXISTS idx_programs_university ON university_programs(university_code);
CREATE INDEX IF NOT EXISTS idx_programs_category ON university_programs(category);
CREATE INDEX IF NOT EXISTS idx_trends_industry ON employment_trends(industry);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(user_id)

