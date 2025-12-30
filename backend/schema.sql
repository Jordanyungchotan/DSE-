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
  avatar TEXT,                        -- 头像（base64或URL）
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
-- 智能刷题相关表
-- =====================

-- 刷题会话表
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  config TEXT NOT NULL, -- JSON: 刷题配置
  status TEXT DEFAULT 'active', -- 'active' | 'completed' | 'paused'
  questions TEXT NOT NULL, -- JSON: 生成的题目列表
  start_time TEXT DEFAULT CURRENT_TIMESTAMP,
  end_time TEXT,
  score INTEGER,
  accuracy REAL,
  total_time INTEGER, -- 总用时（秒）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 用户答案记录表
CREATE TABLE IF NOT EXISTS quiz_answers (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  user_answer TEXT,
  is_correct INTEGER, -- 0/1
  time_spent INTEGER, -- 答题用时（秒）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE
);

-- 学习进度表
CREATE TABLE IF NOT EXISTS learning_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  last_practiced TEXT,
  confidence_score REAL DEFAULT 0, -- 掌握信心度 0-1
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, subject, topic)
);

-- 错题本表
CREATE TABLE IF NOT EXISTS wrong_questions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice', -- 'multiple_choice' | 'short_answer' | 'calculation' | 'explanation'
  subject TEXT NOT NULL,
  topic TEXT,
  options TEXT, -- JSON array for multiple choice
  user_answer TEXT,
  correct_answer TEXT,
  explanation TEXT,
  difficulty_score INTEGER DEFAULT 3,
  feedback TEXT,
  first_attempt_date TEXT DEFAULT CURRENT_TIMESTAMP,
  last_attempt_date TEXT,
  wrong_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'unreviewed', -- 'unreviewed' | 'reviewed' | 'mastered'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================
-- 排行榜系统相关表
-- =====================

-- 排行榜主表
CREATE TABLE IF NOT EXISTS leaderboards (
  id TEXT PRIMARY KEY,
  leaderboard_type TEXT NOT NULL, -- 'daily' | 'weekly' | 'monthly' | 'all_time'
  ranking_criteria TEXT NOT NULL, -- 'composite' | 'accuracy' | 'speed' | 'subject'
  subject TEXT,                   -- 科目（科目排行榜时使用）
  grade TEXT,                     -- 年级（年级排行榜时使用）
  difficulty TEXT,                -- 难度（难度排行榜时使用）
  
  -- 统计信息
  total_participants INTEGER DEFAULT 0,
  average_score REAL,
  last_calculated_at TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  
  -- 时间范围
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 排行榜条目表
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  leaderboard_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- 排名信息
  rank_position INTEGER NOT NULL,
  previous_rank INTEGER,
  rank_change INTEGER DEFAULT 0,
  
  -- 分数信息
  total_score REAL NOT NULL,
  accuracy_score REAL,        -- 正确率得分（0-40）
  speed_score REAL,           -- 速度得分（0-20）
  difficulty_bonus REAL,      -- 难度加成（0-20）
  consistency_bonus REAL,     -- 稳定性加成（0-10）
  activity_bonus REAL,        -- 活跃度加成（0-10）
  
  -- 统计信息
  accuracy REAL,              -- 正确率
  avg_time_per_question REAL, -- 平均每题时间（秒）
  total_sessions INTEGER,     -- 总场次
  total_questions INTEGER,    -- 总题目数
  best_session_score REAL,    -- 单场最高分
  
  -- 时间信息
  last_activity_at TEXT NOT NULL,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (leaderboard_id) REFERENCES leaderboards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户排名统计表（用于快速查询用户排名数据）
CREATE TABLE IF NOT EXISTS user_ranking_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  
  -- 总体统计
  total_sessions INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0,  -- 总用时（秒）
  
  -- 各难度统计
  basic_sessions INTEGER DEFAULT 0,
  standard_sessions INTEGER DEFAULT 0,
  challenging_sessions INTEGER DEFAULT 0,
  exam_sessions INTEGER DEFAULT 0,
  
  -- 连续记录
  current_streak INTEGER DEFAULT 0,    -- 当前连胜
  longest_streak INTEGER DEFAULT 0,    -- 历史最长连胜
  perfect_sessions INTEGER DEFAULT 0,  -- 满分场次
  
  -- 活跃度
  activity_level TEXT DEFAULT 'low',   -- 'low' | 'medium' | 'high' | 'excellent'
  last_7_days_sessions INTEGER DEFAULT 0,
  last_30_days_sessions INTEGER DEFAULT 0,
  
  -- 平均表现
  average_accuracy REAL DEFAULT 0,
  average_time_per_question REAL DEFAULT 0,
  
  -- 最近5次成绩（用于计算稳定性）
  recent_scores TEXT,  -- JSON array of recent scores
  
  last_activity_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户排名历史表（用于追踪排名变化）
CREATE TABLE IF NOT EXISTS user_rank_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  leaderboard_type TEXT NOT NULL,
  ranking_criteria TEXT NOT NULL,
  
  rank_position INTEGER NOT NULL,
  score REAL NOT NULL,
  
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 防作弊监测表
CREATE TABLE IF NOT EXISTS anti_cheat_monitor (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  behavior_type TEXT NOT NULL, -- 'speed_hacking' | 'pattern_repeat' | 'multi_account'
  suspicion_level INTEGER DEFAULT 1,
  evidence TEXT,  -- JSON
  action_taken TEXT,
  
  detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 用户排行榜设置表
CREATE TABLE IF NOT EXISTS user_leaderboard_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  
  is_anonymous INTEGER DEFAULT 0,     -- 是否匿名
  hide_school INTEGER DEFAULT 0,      -- 是否隐藏学校
  display_name TEXT,                  -- 显示名称
  avatar TEXT,                        -- 头像URL
  grade TEXT,                         -- 年级
  school TEXT,                        -- 学校
  
  -- 排行榜资格
  is_eligible INTEGER DEFAULT 1,      -- 是否有排名资格
  banned_until TEXT,                  -- 禁榜截止时间
  ban_reason TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================
-- 题目多样性增强系统
-- =====================

-- 题目指纹表
CREATE TABLE IF NOT EXISTS question_fingerprints (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  semantic_hash TEXT NOT NULL,          -- 语义哈希
  structural_features TEXT NOT NULL,    -- JSON: 结构特征
  numerical_pattern TEXT NOT NULL,      -- JSON: 数值模式
  conceptual_signature TEXT NOT NULL,   -- JSON: 概念签名
  answer_pattern TEXT,                  -- JSON: 答案模式
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(question_id)
);

-- 题目变体关系表
CREATE TABLE IF NOT EXISTS question_variants (
  id TEXT PRIMARY KEY,
  base_question_id TEXT NOT NULL,
  variant_question_id TEXT NOT NULL,
  variant_type TEXT NOT NULL,           -- 'numeric' | 'contextual' | 'structural'
  similarity_score REAL DEFAULT 0,      -- 相似度 0-1
  variation_distance REAL DEFAULT 0,    -- 变异距离 0-1
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 知识图谱节点表
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_en TEXT,                         -- 英文名称
  type TEXT NOT NULL,                   -- 'subject' | 'topic' | 'concept' | 'skill'
  subject TEXT,                         -- 所属科目
  parent_id TEXT,                       -- 父节点ID
  metadata TEXT,                        -- JSON: 其他元数据
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 知识图谱关系表
CREATE TABLE IF NOT EXISTS knowledge_relationships (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,      -- 'prerequisite' | 'related_to' | 'part_of' | 'requires_skill' | 'leads_to'
  strength REAL DEFAULT 1.0,            -- 关系强度 0-1
  metadata TEXT,                        -- JSON: 其他元数据
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
);

-- 题目生成历史表（用于避免重复）
CREATE TABLE IF NOT EXISTS question_generation_history (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  session_id TEXT,
  subject TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT,
  question_fingerprint_id TEXT,
  question_text TEXT NOT NULL,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (question_fingerprint_id) REFERENCES question_fingerprints(id) ON DELETE SET NULL
);

-- 题目质量反馈表
CREATE TABLE IF NOT EXISTS question_feedback (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  user_id TEXT,
  rating INTEGER,                       -- 1-5评分
  difficulty_perception INTEGER,        -- 用户感知难度 1-5
  clarity_rating INTEGER,               -- 清晰度评分 1-5
  feedback_text TEXT,                   -- 文字反馈
  suggestions TEXT,                     -- 改进建议
  is_reported INTEGER DEFAULT 0,        -- 是否举报
  report_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 题目表现指标表
CREATE TABLE IF NOT EXISTS question_performance (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  average_time INTEGER DEFAULT 0,       -- 平均用时（秒）
  abandonment_count INTEGER DEFAULT 0,  -- 放弃次数
  actual_difficulty REAL,               -- 实际难度 0-1
  clarity_score REAL,                   -- 清晰度评分
  educational_value REAL,               -- 教育价值
  exposure_count INTEGER DEFAULT 0,     -- 曝光次数
  metrics TEXT,                         -- JSON: 其他指标
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Agent执行日志表
CREATE TABLE IF NOT EXISTS agent_execution_logs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  input_data TEXT,                      -- JSON
  output_data TEXT,                     -- JSON
  execution_time INTEGER,               -- 毫秒
  success INTEGER DEFAULT 1,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 索引
-- =====================

-- 题目指纹相关索引
CREATE INDEX IF NOT EXISTS idx_fingerprints_question ON question_fingerprints(question_id);
CREATE INDEX IF NOT EXISTS idx_fingerprints_semantic ON question_fingerprints(semantic_hash);
CREATE INDEX IF NOT EXISTS idx_variants_base ON question_variants(base_question_id);
CREATE INDEX IF NOT EXISTS idx_variants_variant ON question_variants(variant_question_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_subject ON knowledge_nodes(subject);
CREATE INDEX IF NOT EXISTS idx_knowledge_rels_source ON knowledge_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_rels_target ON knowledge_relationships(target_id);
CREATE INDEX IF NOT EXISTS idx_gen_history_user ON question_generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_gen_history_subject ON question_generation_history(subject);
CREATE INDEX IF NOT EXISTS idx_question_feedback_question ON question_feedback(question_id);
CREATE INDEX IF NOT EXISTS idx_question_perf_question ON question_performance(question_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_execution_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_time ON agent_execution_logs(created_at);

-- 排行榜相关索引
CREATE INDEX IF NOT EXISTS idx_leaderboards_type ON leaderboards(leaderboard_type);
CREATE INDEX IF NOT EXISTS idx_leaderboards_criteria ON leaderboards(ranking_criteria);
CREATE INDEX IF NOT EXISTS idx_leaderboards_subject_grade ON leaderboards(subject, grade);
CREATE INDEX IF NOT EXISTS idx_leaderboards_valid ON leaderboards(valid_until);

CREATE INDEX IF NOT EXISTS idx_entries_leaderboard ON leaderboard_entries(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_entries_user ON leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_rank ON leaderboard_entries(rank_position);
CREATE INDEX IF NOT EXISTS idx_entries_score ON leaderboard_entries(total_score);

CREATE INDEX IF NOT EXISTS idx_ranking_stats_user ON user_ranking_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_ranking_stats_accuracy ON user_ranking_stats(average_accuracy);

CREATE INDEX IF NOT EXISTS idx_rank_history_user ON user_rank_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rank_history_period ON user_rank_history(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_anti_cheat_user ON anti_cheat_monitor(user_id);
CREATE INDEX IF NOT EXISTS idx_anti_cheat_type ON anti_cheat_monitor(behavior_type);

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
CREATE INDEX IF NOT EXISTS idx_favorites_user ON user_favorites(user_id);

-- 刷题相关索引
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session ON quiz_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_user ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_subject ON learning_progress(subject);
CREATE INDEX IF NOT EXISTS idx_wrong_questions_user ON wrong_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_questions_subject ON wrong_questions(subject);
CREATE INDEX IF NOT EXISTS idx_wrong_questions_status ON wrong_questions(status);

-- =====================
-- DSE水平测试系统相关表
-- =====================

-- 水平测试主表
CREATE TABLE IF NOT EXISTS level_tests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  
  -- 测试配置
  grade TEXT NOT NULL,                    -- '中四' | '中五' | '中六'
  subject TEXT NOT NULL,                  -- 科目名称
  test_type TEXT DEFAULT 'full',          -- 'quick'(15-20题) | 'full'(25-30题)
  
  -- 测试状态
  status TEXT DEFAULT 'pending',          -- 'pending' | 'in_progress' | 'completed' | 'graded' | 'expired'
  
  -- 评分结果
  raw_score REAL,                         -- 原始得分
  weighted_score REAL,                    -- 加权得分
  final_score REAL,                       -- 最终得分（0-100）
  level TEXT,                             -- DSE等级
  percentile REAL,                        -- 百分位排名
  
  -- 多维分析得分
  dimension_scores TEXT,                  -- JSON
  
  -- 时间相关
  time_limit INTEGER,                     -- 时间限制（秒）
  time_spent INTEGER DEFAULT 0,           -- 实际用时（秒）
  started_at TEXT,                        -- 开始时间
  completed_at TEXT,                      -- 完成时间
  graded_at TEXT,                         -- 批改完成时间
  
  -- 进度追踪
  current_question_index INTEGER DEFAULT 0,
  answered_count INTEGER DEFAULT 0,
  
  -- 元数据
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 测试题目表
CREATE TABLE IF NOT EXISTS test_questions (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  
  -- 题目基本信息
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,             -- 'choice' | 'short' | 'long'
  
  -- 选择题专用
  options TEXT,                            -- JSON
  
  -- 答案与评分
  correct_answer TEXT NOT NULL,
  scoring_points TEXT,                     -- JSON
  max_score REAL DEFAULT 1.0,
  
  -- 用户作答
  user_answer TEXT,
  user_score REAL,
  auto_graded INTEGER DEFAULT 0,
  manual_graded INTEGER DEFAULT 0,
  grading_feedback TEXT,
  
  -- 题目属性
  difficulty TEXT DEFAULT 'medium',
  difficulty_weight REAL DEFAULT 1.0,
  estimated_time INTEGER DEFAULT 120,
  actual_time INTEGER,
  
  -- 知识点关联
  knowledge_points TEXT,                   -- JSON
  dse_reference TEXT,
  topic TEXT,
  
  -- 标记
  is_marked INTEGER DEFAULT 0,
  is_skipped INTEGER DEFAULT 0,
  
  -- 时间追踪
  answered_at TEXT,
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE
);

-- 题目缓存表
CREATE TABLE IF NOT EXISTS question_cache (
  id TEXT PRIMARY KEY,
  
  -- 题目分类
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  question_type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  
  -- 题目内容
  question_text TEXT NOT NULL,
  options TEXT,
  correct_answer TEXT NOT NULL,
  scoring_points TEXT,
  knowledge_points TEXT,
  dse_reference TEXT,
  estimated_time INTEGER DEFAULT 120,
  
  -- 质量指标
  usage_count INTEGER DEFAULT 0,
  avg_score REAL,
  avg_time REAL,
  discrimination_index REAL,
  quality_rating REAL DEFAULT 3.0,
  
  -- 审核状态
  review_status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TEXT,
  review_notes TEXT,
  
  -- 生成来源
  source TEXT DEFAULT 'ai',
  ai_model TEXT,
  
  -- 时间
  last_used TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  
  -- 总体评估
  overall_level TEXT NOT NULL,
  overall_score REAL NOT NULL,
  grade_equivalent TEXT,
  
  -- 能力维度分析
  ability_radar TEXT NOT NULL,             -- JSON
  
  -- 知识点分析
  strength_points TEXT,                    -- JSON
  weakness_points TEXT,                    -- JSON
  
  -- 错误分析
  error_patterns TEXT,                     -- JSON
  common_mistakes TEXT,                    -- JSON
  
  -- 学习建议
  recommendations TEXT,                    -- JSON
  study_plan TEXT,                         -- JSON
  expected_progress TEXT,                  -- JSON
  
  -- 对比分析
  peer_comparison TEXT,                    -- JSON
  historical_comparison TEXT,              -- JSON
  
  -- 报告生成
  generated_by TEXT DEFAULT 'ai',
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  -- 元数据
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
  
  subject_stats TEXT,                      -- JSON
  grade_stats TEXT,                        -- JSON
  
  improvement_trend TEXT,                  -- JSON
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
  
  answers_snapshot TEXT NOT NULL,          -- JSON
  current_index INTEGER NOT NULL,
  time_remaining INTEGER NOT NULL,
  marked_questions TEXT,                   -- JSON
  
  saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 题目审核队列表
CREATE TABLE IF NOT EXISTS question_review_queue (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  source_type TEXT NOT NULL,               -- 'generated' | 'cached'
  status TEXT DEFAULT 'pending',           -- 'pending' | 'approved' | 'rejected' | 'modified'
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
  
  learning_objectives TEXT,                -- JSON
  key_concepts TEXT,                       -- JSON
  skills_required TEXT,                    -- JSON
  
  exam_weight REAL,
  typical_question_types TEXT,             -- JSON
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
CREATE INDEX IF NOT EXISTS idx_level_tests_level ON level_tests(level);

CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_type ON test_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_test_questions_difficulty ON test_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_test_questions_index ON test_questions(test_id, question_index);

CREATE INDEX IF NOT EXISTS idx_question_cache_grade_subject ON question_cache(grade, subject);
CREATE INDEX IF NOT EXISTS idx_question_cache_difficulty ON question_cache(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_cache_type ON question_cache(question_type);
CREATE INDEX IF NOT EXISTS idx_question_cache_quality ON question_cache(quality_rating);
CREATE INDEX IF NOT EXISTS idx_question_cache_review ON question_cache(review_status);

CREATE INDEX IF NOT EXISTS idx_test_reports_user ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_test ON test_reports(test_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_level ON test_reports(overall_level);

CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_test ON test_knowledge_mastery(test_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_user ON test_knowledge_mastery(user_id);

CREATE INDEX IF NOT EXISTS idx_user_test_stats_user ON user_test_stats(user_id);

CREATE INDEX IF NOT EXISTS idx_autosave_test ON test_autosave(test_id);
CREATE INDEX IF NOT EXISTS idx_autosave_user ON test_autosave(user_id);

CREATE INDEX IF NOT EXISTS idx_review_queue_status ON question_review_queue(status);

CREATE INDEX IF NOT EXISTS idx_curriculum_subject ON dse_curriculum(subject);
CREATE INDEX IF NOT EXISTS idx_curriculum_grade ON dse_curriculum(grade);

