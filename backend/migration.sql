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

-- =====================
-- DSE水平测试系统表迁移
-- =====================

-- 水平测试主表
CREATE TABLE IF NOT EXISTS level_tests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  test_type TEXT DEFAULT 'full',
  status TEXT DEFAULT 'pending',
  raw_score REAL,
  weighted_score REAL,
  final_score REAL,
  level TEXT,
  percentile REAL,
  dimension_scores TEXT,
  time_limit INTEGER,
  time_spent INTEGER DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  graded_at TEXT,
  current_question_index INTEGER DEFAULT 0,
  answered_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 测试题目表
CREATE TABLE IF NOT EXISTS test_questions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options TEXT,
  correct_answer TEXT NOT NULL,
  scoring_points TEXT,
  max_score REAL DEFAULT 1.0,
  user_answer TEXT,
  user_score REAL,
  auto_graded INTEGER DEFAULT 0,
  manual_graded INTEGER DEFAULT 0,
  grading_feedback TEXT,
  difficulty TEXT DEFAULT 'medium',
  difficulty_weight REAL DEFAULT 1.0,
  estimated_time INTEGER DEFAULT 120,
  actual_time INTEGER,
  knowledge_points TEXT,
  dse_reference TEXT,
  topic TEXT,
  is_marked INTEGER DEFAULT 0,
  is_skipped INTEGER DEFAULT 0,
  answered_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE
);

-- 题目缓存表
CREATE TABLE IF NOT EXISTS question_cache (
  id TEXT PRIMARY KEY,
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  question_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT,
  correct_answer TEXT NOT NULL,
  scoring_points TEXT,
  knowledge_points TEXT,
  dse_reference TEXT,
  estimated_time INTEGER DEFAULT 120,
  usage_count INTEGER DEFAULT 0,
  avg_score REAL,
  avg_time REAL,
  discrimination_index REAL,
  quality_rating REAL DEFAULT 3.0,
  review_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  source TEXT DEFAULT 'ai',
  ai_model TEXT,
  last_used TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  overall_level TEXT NOT NULL,
  overall_score REAL NOT NULL,
  grade_equivalent TEXT,
  ability_radar TEXT NOT NULL,
  strength_points TEXT,
  weakness_points TEXT,
  error_patterns TEXT,
  common_mistakes TEXT,
  recommendations TEXT,
  study_plan TEXT,
  expected_progress TEXT,
  peer_comparison TEXT,
  historical_comparison TEXT,
  generated_by TEXT DEFAULT 'ai',
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 知识点掌握度表
CREATE TABLE IF NOT EXISTS test_knowledge_mastery (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  knowledge_point TEXT NOT NULL,
  topic TEXT,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  mastery_level TEXT,
  mastery_score REAL,
  questions_count INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  avg_time REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户测试历史统计表
CREATE TABLE IF NOT EXISTS user_test_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  total_tests INTEGER DEFAULT 0,
  completed_tests INTEGER DEFAULT 0,
  subject_stats TEXT,
  grade_stats TEXT,
  improvement_trend TEXT,
  best_level TEXT,
  best_score REAL,
  last_test_at TEXT,
  tests_this_month INTEGER DEFAULT 0,
  tests_this_week INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 测试自动保存表
CREATE TABLE IF NOT EXISTS test_autosave (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  answers_snapshot TEXT NOT NULL,
  current_index INTEGER NOT NULL,
  time_remaining INTEGER NOT NULL,
  marked_questions TEXT,
  saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 题目审核队列表
CREATE TABLE IF NOT EXISTS question_review_queue (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewer_id TEXT,
  review_comments TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 评估算法校准日志
CREATE TABLE IF NOT EXISTS grading_calibration_logs (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  ai_score REAL NOT NULL,
  manual_score REAL NOT NULL,
  score_difference REAL NOT NULL,
  adjustment_factor REAL,
  calibration_notes TEXT,
  calibrated_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE
);

-- DSE课程大纲表
CREATE TABLE IF NOT EXISTS dse_curriculum (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  module TEXT,
  topic TEXT NOT NULL,
  subtopic TEXT,
  learning_objectives TEXT,
  key_concepts TEXT,
  skills_required TEXT,
  exam_weight REAL,
  typical_question_types TEXT,
  difficulty_level TEXT,
  reference_code TEXT,
  version TEXT DEFAULT '2024',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 水平测试相关索引
CREATE INDEX IF NOT EXISTS idx_level_tests_user ON level_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_level_tests_status ON level_tests(status);
CREATE INDEX IF NOT EXISTS idx_level_tests_grade_subject ON level_tests(grade, subject);
CREATE INDEX IF NOT EXISTS idx_level_tests_created ON level_tests(created_at);

CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_type ON test_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_test_questions_index ON test_questions(test_id, question_index);

CREATE INDEX IF NOT EXISTS idx_question_cache_grade_subject ON question_cache(grade, subject);
CREATE INDEX IF NOT EXISTS idx_question_cache_difficulty ON question_cache(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_cache_type ON question_cache(question_type);

CREATE INDEX IF NOT EXISTS idx_test_reports_user ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_test ON test_reports(test_id);

CREATE INDEX IF NOT EXISTS idx_autosave_test ON test_autosave(test_id);
CREATE INDEX IF NOT EXISTS idx_autosave_user ON test_autosave(user_id);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON question_review_queue(status);

-- =====================
-- 积分系统表迁移
-- =====================

-- 积分事件表（唯一事实来源）
CREATE TABLE IF NOT EXISTS point_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  related_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 积分聚合表（排行榜 & 快速读取）
CREATE TABLE IF NOT EXISTS user_point_summary (
  user_id TEXT PRIMARY KEY,
  total_points INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户每日任务计数表
CREATE TABLE IF NOT EXISTS user_daily_task_counts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task TEXT NOT NULL,
  count_date TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, task, count_date)
);

-- 积分商城商品表
CREATE TABLE IF NOT EXISTS point_mall_items (
  id TEXT PRIMARY KEY,
  name_zh TEXT NOT NULL,
  name_en TEXT,
  description_zh TEXT,
  description_en TEXT,
  category TEXT NOT NULL,
  required_points INTEGER NOT NULL,
  stock INTEGER DEFAULT -1,
  image_url TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 积分兑换记录表
CREATE TABLE IF NOT EXISTS point_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  fulfilled_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES point_mall_items(id)
);

-- 积分系统索引
CREATE INDEX IF NOT EXISTS idx_point_events_user ON point_events(user_id);
CREATE INDEX IF NOT EXISTS idx_point_events_task ON point_events(task);
CREATE INDEX IF NOT EXISTS idx_point_events_created ON point_events(created_at);
CREATE INDEX IF NOT EXISTS idx_point_summary_points ON user_point_summary(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_daily_task_user_date ON user_daily_task_counts(user_id, count_date);
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON point_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_mall_items_category ON point_mall_items(category);

-- =====================
-- 学习行为事实表（唯一数据来源）
-- =====================
-- 排行榜、积分、学习分析的统一事实来源
-- append-only，只增不改

CREATE TABLE IF NOT EXISTS learning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,          -- QUIZ | LEVEL_TEST | ANALYSIS
  subject TEXT,                       -- 科目（可选）
  question_count INTEGER DEFAULT 0,   -- 题目数量
  correct_count INTEGER DEFAULT 0,    -- 正确数量
  duration_seconds INTEGER DEFAULT 0, -- 用时（秒）
  accuracy REAL DEFAULT 0,            -- 正确率 (0-1)
  source_id TEXT,                     -- 来源 ID（如 quiz_session_id, level_test_id）
  metadata TEXT,                      -- 额外元数据（JSON）
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 学习行为事实表索引
CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_subject ON learning_events(subject);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_type ON learning_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_user_date ON learning_events(user_id, DATE(created_at));

-- =====================
-- 题目级别事实表（错题本 & 学习档案的唯一数据来源）
-- =====================
-- 规则：
-- 1. 一道题一次作答 = 一条记录
-- 2. 永远 INSERT，不允许 UPDATE
-- 3. 这是错题本 & 学习档案的唯一"原始事实"

CREATE TABLE IF NOT EXISTS question_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  
  -- 题目信息
  question_id TEXT NOT NULL,              -- 题目唯一 ID
  question_text TEXT,                     -- 题目内容
  question_type TEXT,                     -- 选择题 / 计算题 / 简答题
  subject TEXT,                           -- 科目
  topic TEXT,                             -- 知识点
  
  -- 作答信息
  selected_answer TEXT,                   -- 用户选择/填写的答案
  correct_answer TEXT,                    -- 正确答案
  is_correct INTEGER DEFAULT 0,           -- 是否正确 (0/1)
  
  -- 解析 & 时间
  explanation TEXT,                       -- 解析
  duration_seconds INTEGER DEFAULT 0,     -- 答题用时（秒）
  
  -- 来源信息
  source_type TEXT,                       -- 来源类型: QUIZ | LEVEL_TEST | WRONG_REVIEW
  source_id TEXT,                         -- 来源 ID（quiz_session_id / level_test_id）
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 题目级别事实表索引
CREATE INDEX IF NOT EXISTS idx_question_attempts_user ON question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_subject ON question_attempts(subject);
CREATE INDEX IF NOT EXISTS idx_question_attempts_topic ON question_attempts(topic);
CREATE INDEX IF NOT EXISTS idx_question_attempts_correct ON question_attempts(is_correct);
CREATE INDEX IF NOT EXISTS idx_question_attempts_created ON question_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_subject ON question_attempts(user_id, subject);
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_date ON question_attempts(user_id, DATE(created_at));
