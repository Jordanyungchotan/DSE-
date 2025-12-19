-- 数据库迁移脚本
-- 为现有表添加新列并创建新表

-- 为 analysis_records 添加 analysis_type 列
ALTER TABLE analysis_records ADD COLUMN analysis_type TEXT DEFAULT 'transfer';

-- 创建学生居住信息表
CREATE TABLE IF NOT EXISTS student_residence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT,
  max_commute_time INTEGER DEFAULT 60,
  transport_preference TEXT DEFAULT 'public',
  cross_district INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建学校偏好表
CREATE TABLE IF NOT EXISTS school_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  school_type TEXT DEFAULT 'coed',
  religion_preference TEXT,
  extracurricular_importance INTEGER DEFAULT 3,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建学校推荐记录表
CREATE TABLE IF NOT EXISTS school_recommendations (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  recommended_schools TEXT NOT NULL,
  recommendation_reasons TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (analysis_id) REFERENCES analysis_records(id) ON DELETE CASCADE
);

-- 创建香港中学数据表
CREATE TABLE IF NOT EXISTS hk_schools (
  id TEXT PRIMARY KEY,
  name_zh TEXT NOT NULL,
  name_en TEXT,
  district TEXT NOT NULL,
  school_type TEXT,
  religion TEXT,
  funding_type TEXT,
  banding INTEGER,
  dse_performance TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL,
  facilities TEXT,
  extracurriculars TEXT,
  website TEXT,
  admission_info TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建大学申请资料表
CREATE TABLE IF NOT EXISTS university_applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  dse_results TEXT NOT NULL,
  best_five_score INTEGER,
  best_six_score INTEGER,
  target_universities TEXT,
  target_majors TEXT,
  extracurriculars TEXT,
  leadership_experience TEXT,
  volunteer_hours INTEGER,
  career_interests TEXT,
  expected_salary_range TEXT,
  work_location_preference TEXT,
  application_year INTEGER,
  need_scholarship INTEGER DEFAULT 0,
  consider_associate INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建大学专业数据表
CREATE TABLE IF NOT EXISTS university_programs (
  id TEXT PRIMARY KEY,
  university_code TEXT NOT NULL,
  university_name_zh TEXT NOT NULL,
  university_name_en TEXT NOT NULL,
  program_code TEXT,
  program_name_zh TEXT NOT NULL,
  program_name_en TEXT,
  category TEXT,
  jupas_code TEXT,
  min_score_2024 INTEGER,
  median_score_2024 INTEGER,
  admission_rate REAL,
  interview_required INTEGER DEFAULT 0,
  special_requirements TEXT,
  career_prospects TEXT,
  average_starting_salary INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建就业趋势数据表
CREATE TABLE IF NOT EXISTS employment_trends (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL,
  industry_zh TEXT NOT NULL,
  growth_rate REAL,
  average_salary INTEGER,
  entry_salary INTEGER,
  demand_level TEXT,
  future_outlook TEXT,
  ai_impact TEXT,
  required_skills TEXT,
  related_majors TEXT,
  data_source TEXT,
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建收藏夹表
CREATE TABLE IF NOT EXISTS user_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_analysis_type ON analysis_records(analysis_type);
CREATE INDEX IF NOT EXISTS idx_residence_user ON student_residence(user_id);
CREATE INDEX IF NOT EXISTS idx_residence_district ON student_residence(district);
CREATE INDEX IF NOT EXISTS idx_schools_district ON hk_schools(district);
CREATE INDEX IF NOT EXISTS idx_schools_banding ON hk_schools(banding);
CREATE INDEX IF NOT EXISTS idx_programs_university ON university_programs(university_code);
CREATE INDEX IF NOT EXISTS idx_programs_category ON university_programs(category);
CREATE INDEX IF NOT EXISTS idx_trends_industry ON employment_trends(industry);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(user_id);

