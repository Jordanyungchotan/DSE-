-- =====================================================
-- DSE水平测试系统数据库Schema
-- Version: 1.0
-- Date: 2025-12-30
-- =====================================================

-- =====================
-- 核心测试表
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
  weighted_score REAL,                    -- 加权得分（考虑题目难度）
  final_score REAL,                       -- 最终得分（0-100）
  level TEXT,                             -- DSE等级: '5**' | '5*' | '5' | '4' | '3' | '2' | '1' | 'U'
  percentile REAL,                        -- 百分位排名
  
  -- 多维分析得分（JSON）
  dimension_scores TEXT,                  -- JSON: {knowledge: 85, application: 78, analysis: 72, speed: 80}
  
  -- 时间相关
  time_limit INTEGER,                     -- 时间限制（秒）
  time_spent INTEGER DEFAULT 0,           -- 实际用时（秒）
  started_at TEXT,                        -- 开始时间
  completed_at TEXT,                      -- 完成时间
  graded_at TEXT,                         -- 批改完成时间
  
  -- 进度追踪
  current_question_index INTEGER DEFAULT 0,  -- 当前题目索引
  answered_count INTEGER DEFAULT 0,          -- 已答题数
  
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
  question_index INTEGER NOT NULL,         -- 题目序号（从0开始）
  question_text TEXT NOT NULL,             -- 题目内容
  question_type TEXT NOT NULL,             -- 'choice' | 'short' | 'long'
  
  -- 选择题专用
  options TEXT,                            -- JSON: ["A. xxx", "B. xxx", "C. xxx", "D. xxx"]
  
  -- 答案与评分
  correct_answer TEXT NOT NULL,            -- 标准答案
  scoring_points TEXT,                     -- JSON: ["得分点1", "得分点2", ...] 用于主观题评分
  max_score REAL DEFAULT 1.0,              -- 题目满分
  
  -- 用户作答
  user_answer TEXT,                        -- 用户答案
  user_score REAL,                         -- 用户得分
  auto_graded INTEGER DEFAULT 0,           -- 是否已自动批改 0/1
  manual_graded INTEGER DEFAULT 0,         -- 是否已人工批改 0/1
  grading_feedback TEXT,                   -- 批改反馈
  
  -- 题目属性
  difficulty TEXT DEFAULT 'medium',        -- 'easy' | 'medium' | 'hard'
  difficulty_weight REAL DEFAULT 1.0,      -- 难度权重（easy=0.8, medium=1.0, hard=1.2）
  estimated_time INTEGER DEFAULT 120,      -- 预估答题时间（秒）
  actual_time INTEGER,                     -- 实际答题时间（秒）
  
  -- 知识点关联
  knowledge_points TEXT,                   -- JSON: ["知识点1", "知识点2"]
  dse_reference TEXT,                      -- DSE考点编号（如 "Math-F4-Ch3-2.1"）
  topic TEXT,                              -- 所属单元/主题
  
  -- 标记
  is_marked INTEGER DEFAULT 0,             -- 用户标记（稍后检查）0/1
  is_skipped INTEGER DEFAULT 0,            -- 是否跳过 0/1
  
  -- 时间追踪
  answered_at TEXT,                        -- 作答时间
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE
);

-- 题目缓存表（用于复用高质量题目）
CREATE TABLE IF NOT EXISTS question_cache (
  id TEXT PRIMARY KEY,
  
  -- 题目分类
  grade TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT,
  question_type TEXT NOT NULL,             -- 'choice' | 'short' | 'long'
  difficulty TEXT NOT NULL,                -- 'easy' | 'medium' | 'hard'
  
  -- 题目内容
  question_text TEXT NOT NULL,
  options TEXT,                            -- JSON for choice questions
  correct_answer TEXT NOT NULL,
  scoring_points TEXT,                     -- JSON
  knowledge_points TEXT,                   -- JSON
  dse_reference TEXT,
  estimated_time INTEGER DEFAULT 120,
  
  -- 质量指标
  usage_count INTEGER DEFAULT 0,           -- 使用次数
  avg_score REAL,                          -- 历史平均得分率
  avg_time REAL,                           -- 平均答题时间（秒）
  discrimination_index REAL,               -- 区分度指数 (-1 to 1)
  quality_rating REAL DEFAULT 3.0,         -- 质量评分 (1-5)
  
  -- 审核状态
  review_status TEXT DEFAULT 'pending',    -- 'pending' | 'approved' | 'rejected' | 'needs_revision'
  reviewed_by TEXT,                        -- 审核人ID
  reviewed_at TEXT,
  review_notes TEXT,
  
  -- 生成来源
  source TEXT DEFAULT 'ai',                -- 'ai' | 'manual' | 'imported'
  ai_model TEXT,                           -- 生成模型（如 "deepseek-v3"）
  
  -- 时间
  last_used TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 测试报告相关表
-- =====================

-- 测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  
  -- 总体评估
  overall_level TEXT NOT NULL,             -- DSE等级
  overall_score REAL NOT NULL,             -- 最终得分
  grade_equivalent TEXT,                   -- 等价年级水平（如"中四上学期"）
  
  -- 能力维度分析（JSON）
  ability_radar TEXT NOT NULL,             -- JSON: {knowledge: 85, application: 78, analysis: 72, synthesis: 68, evaluation: 65}
  
  -- 知识点分析
  strength_points TEXT,                    -- JSON: ["优势知识点1", "优势知识点2"]
  weakness_points TEXT,                    -- JSON: ["薄弱知识点1", "薄弱知识点2"]
  
  -- 错误分析
  error_patterns TEXT,                     -- JSON: [{type: "概念混淆", count: 3, examples: [...]}]
  common_mistakes TEXT,                    -- JSON: ["常见错误1", "常见错误2"]
  
  -- 学习建议
  recommendations TEXT,                    -- JSON: [{priority: 1, topic: "xxx", suggestion: "xxx", resources: [...]}]
  study_plan TEXT,                         -- JSON: 学习计划
  expected_progress TEXT,                  -- JSON: 预期进步时间线
  
  -- 对比分析
  peer_comparison TEXT,                    -- JSON: {sameGradePercentile: 75, sameSubjectPercentile: 80}
  historical_comparison TEXT,              -- JSON: 与历史测试对比
  
  -- 报告生成
  generated_by TEXT DEFAULT 'ai',          -- 'ai' | 'manual'
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
  
  -- 知识点信息
  knowledge_point TEXT NOT NULL,
  topic TEXT,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  
  -- 掌握度评估
  mastery_level TEXT,                      -- 'mastered' | 'developing' | 'struggling' | 'not_covered'
  mastery_score REAL,                      -- 掌握度得分 0-100
  
  -- 答题统计
  questions_count INTEGER DEFAULT 0,       -- 相关题目数
  correct_count INTEGER DEFAULT 0,         -- 正确题目数
  avg_time REAL,                           -- 平均答题时间
  
  -- 时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================
-- 历史记录与统计
-- =====================

-- 用户测试历史统计表
CREATE TABLE IF NOT EXISTS user_test_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  
  -- 总体统计
  total_tests INTEGER DEFAULT 0,
  completed_tests INTEGER DEFAULT 0,
  
  -- 各科目统计（JSON）
  subject_stats TEXT,                      -- JSON: {数学: {count: 5, avgScore: 78, bestLevel: '5'}, ...}
  
  -- 各年级统计（JSON）
  grade_stats TEXT,                        -- JSON: {中四: {count: 3, avgScore: 75}, ...}
  
  -- 进步追踪
  improvement_trend TEXT,                  -- JSON: 进步趋势数据
  best_level TEXT,                         -- 历史最高等级
  best_score REAL,                         -- 历史最高分
  
  -- 活跃度
  last_test_at TEXT,
  tests_this_month INTEGER DEFAULT 0,
  tests_this_week INTEGER DEFAULT 0,
  
  -- 时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 测试自动保存表（用于断点续传）
CREATE TABLE IF NOT EXISTS test_autosave (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- 保存状态
  answers_snapshot TEXT NOT NULL,          -- JSON: 所有答案快照
  current_index INTEGER NOT NULL,          -- 当前题目索引
  time_remaining INTEGER NOT NULL,         -- 剩余时间（秒）
  marked_questions TEXT,                   -- JSON: 标记的题目索引数组
  
  -- 保存时间
  saved_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================
-- 管理员功能表
-- =====================

-- 题目审核队列表
CREATE TABLE IF NOT EXISTS question_review_queue (
  id TEXT PRIMARY KEY,
  question_cache_id TEXT NOT NULL,
  
  -- 审核信息
  review_type TEXT NOT NULL,               -- 'new' | 'reported' | 'revision'
  priority INTEGER DEFAULT 5,              -- 1-10, 10为最高优先级
  status TEXT DEFAULT 'pending',           -- 'pending' | 'in_review' | 'completed'
  
  -- 分配
  assigned_to TEXT,                        -- 分配给的管理员ID
  assigned_at TEXT,
  
  -- 审核结果
  decision TEXT,                           -- 'approve' | 'reject' | 'revise'
  feedback TEXT,
  
  -- 时间
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  
  FOREIGN KEY (question_cache_id) REFERENCES question_cache(id) ON DELETE CASCADE
);

-- 评估算法校准日志
CREATE TABLE IF NOT EXISTS grading_calibration_logs (
  id TEXT PRIMARY KEY,
  
  -- 校准信息
  test_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  
  -- 评分对比
  ai_score REAL NOT NULL,
  manual_score REAL NOT NULL,
  score_difference REAL NOT NULL,
  
  -- 调整
  adjustment_factor REAL,
  calibration_notes TEXT,
  
  -- 时间
  calibrated_by TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (test_id) REFERENCES level_tests(id) ON DELETE CASCADE
);

-- =====================
-- DSE课程大纲参考表
-- =====================

-- DSE课程大纲表
CREATE TABLE IF NOT EXISTS dse_curriculum (
  id TEXT PRIMARY KEY,
  
  -- 分类
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,                     -- '中四' | '中五' | '中六' | 'all'
  module TEXT,                             -- 模块/单元
  topic TEXT NOT NULL,                     -- 主题
  subtopic TEXT,                           -- 子主题
  
  -- 内容
  learning_objectives TEXT,                -- JSON: 学习目标
  key_concepts TEXT,                       -- JSON: 核心概念
  skills_required TEXT,                    -- JSON: 技能要求
  
  -- DSE考试信息
  exam_weight REAL,                        -- 考试权重（%）
  typical_question_types TEXT,             -- JSON: 常见题型
  difficulty_level TEXT,                   -- 'foundation' | 'intermediate' | 'advanced'
  
  -- 元数据
  reference_code TEXT,                     -- 考评局参考编号
  version TEXT DEFAULT '2024',             -- 课程版本
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 索引
-- =====================

-- 水平测试相关索引
CREATE INDEX IF NOT EXISTS idx_level_tests_user ON level_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_level_tests_status ON level_tests(status);
CREATE INDEX IF NOT EXISTS idx_level_tests_grade_subject ON level_tests(grade, subject);
CREATE INDEX IF NOT EXISTS idx_level_tests_created ON level_tests(created_at);
CREATE INDEX IF NOT EXISTS idx_level_tests_level ON level_tests(level);

-- 测试题目相关索引
CREATE INDEX IF NOT EXISTS idx_test_questions_test ON test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_type ON test_questions(question_type);
CREATE INDEX IF NOT EXISTS idx_test_questions_difficulty ON test_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_test_questions_index ON test_questions(test_id, question_index);

-- 题目缓存相关索引
CREATE INDEX IF NOT EXISTS idx_question_cache_grade_subject ON question_cache(grade, subject);
CREATE INDEX IF NOT EXISTS idx_question_cache_difficulty ON question_cache(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_cache_type ON question_cache(question_type);
CREATE INDEX IF NOT EXISTS idx_question_cache_quality ON question_cache(quality_rating);
CREATE INDEX IF NOT EXISTS idx_question_cache_review ON question_cache(review_status);
CREATE INDEX IF NOT EXISTS idx_question_cache_usage ON question_cache(usage_count);

-- 报告相关索引
CREATE INDEX IF NOT EXISTS idx_test_reports_user ON test_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_test ON test_reports(test_id);
CREATE INDEX IF NOT EXISTS idx_test_reports_level ON test_reports(overall_level);

-- 知识点掌握度索引
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_test ON test_knowledge_mastery(test_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_user ON test_knowledge_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_point ON test_knowledge_mastery(knowledge_point);

-- 用户统计索引
CREATE INDEX IF NOT EXISTS idx_user_test_stats_user ON user_test_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_test_stats_last ON user_test_stats(last_test_at);

-- 自动保存索引
CREATE INDEX IF NOT EXISTS idx_autosave_test ON test_autosave(test_id);
CREATE INDEX IF NOT EXISTS idx_autosave_user ON test_autosave(user_id);

-- 审核队列索引
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON question_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_review_queue_priority ON question_review_queue(priority);
CREATE INDEX IF NOT EXISTS idx_review_queue_assigned ON question_review_queue(assigned_to);

-- 课程大纲索引
CREATE INDEX IF NOT EXISTS idx_curriculum_subject ON dse_curriculum(subject);
CREATE INDEX IF NOT EXISTS idx_curriculum_grade ON dse_curriculum(grade);
CREATE INDEX IF NOT EXISTS idx_curriculum_topic ON dse_curriculum(topic);

