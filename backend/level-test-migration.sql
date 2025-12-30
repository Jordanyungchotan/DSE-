-- DSE水平测试系统表迁移
-- 仅创建新表，跳过已存在的表

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
