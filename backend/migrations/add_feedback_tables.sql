-- 用户反馈系统迁移脚本
-- 执行命令: wrangler d1 execute dse-database --file=./migrations/add_feedback_tables.sql

-- =====================
-- 用户反馈系统
-- =====================

-- 分析反馈表（收集用户真实结果）
CREATE TABLE IF NOT EXISTS analysis_feedback (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,                    -- 关联的分析记录ID
  user_id TEXT,                                 -- 用户ID（可选，支持匿名反馈）
  
  -- 反馈核心字段
  user_outcome TEXT NOT NULL,                   -- 'success' | 'failure' | 'not_tried' | 'pending'
  target_school TEXT,                           -- 反馈针对的目标学校
  
  -- 可选：更新后的成绩信息
  updated_scores TEXT,                          -- JSON: 更新后的各科成绩
  
  -- 转化相关
  is_enrolled INTEGER DEFAULT 0,                -- 是否报名机构课程 0/1
  enrolled_course TEXT,                         -- 报名的课程名称
  
  -- 详细反馈
  feedback_text TEXT,                           -- 用户文字反馈
  difficulty_rating INTEGER,                    -- 用户感知的难度 1-5
  accuracy_rating INTEGER,                      -- 用户对分析准确度的评价 1-5
  usefulness_rating INTEGER,                    -- 用户对建议有用性的评价 1-5
  
  -- 元数据
  feedback_source TEXT DEFAULT 'web',           -- 'web' | 'app' | 'followup'
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (analysis_id) REFERENCES analysis_records(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 反馈统计表（用于快速查询汇总数据）
CREATE TABLE IF NOT EXISTS feedback_statistics (
  id TEXT PRIMARY KEY,
  period_start TEXT NOT NULL,                   -- 统计周期开始
  period_end TEXT NOT NULL,                     -- 统计周期结束
  
  -- 结果统计
  total_feedbacks INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  not_tried_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  
  -- 转化统计
  enrollment_count INTEGER DEFAULT 0,           -- 报名课程数
  enrollment_rate REAL,                         -- 转化率
  
  -- 评分统计
  avg_accuracy_rating REAL,
  avg_usefulness_rating REAL,
  
  -- 按等级分布
  level_a_success_rate REAL,
  level_b_success_rate REAL,
  level_c_success_rate REAL,
  level_d_success_rate REAL,
  level_e_success_rate REAL,
  
  calculated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 反馈提醒表（用于跟进用户）
CREATE TABLE IF NOT EXISTS feedback_reminders (
  id TEXT PRIMARY KEY,
  analysis_id TEXT NOT NULL,
  user_id TEXT,
  
  reminder_type TEXT NOT NULL,                  -- 'initial' | 'followup' | 'final'
  scheduled_at TEXT NOT NULL,                   -- 计划发送时间
  sent_at TEXT,                                 -- 实际发送时间
  status TEXT DEFAULT 'pending',                -- 'pending' | 'sent' | 'responded' | 'cancelled'
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (analysis_id) REFERENCES analysis_records(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 反馈相关索引
CREATE INDEX IF NOT EXISTS idx_feedback_analysis ON analysis_feedback(analysis_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON analysis_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_outcome ON analysis_feedback(user_outcome);
CREATE INDEX IF NOT EXISTS idx_feedback_enrolled ON analysis_feedback(is_enrolled);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON analysis_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_stats_period ON feedback_statistics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_feedback_reminders_status ON feedback_reminders(status);
CREATE INDEX IF NOT EXISTS idx_feedback_reminders_scheduled ON feedback_reminders(scheduled_at);
