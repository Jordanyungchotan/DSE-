-- 咨询预约系统迁移脚本
-- 执行命令: wrangler d1 execute dse-database --file=./migrations/add_consultation_tables.sql

-- =====================
-- 咨询预约系统
-- =====================

-- 咨询预约表
CREATE TABLE IF NOT EXISTS consultation_bookings (
  id TEXT PRIMARY KEY,
  analysis_id TEXT,                             -- 关联的分析记录ID（可选）
  user_id TEXT,                                 -- 用户ID（可选）
  
  -- 联系信息
  contact_name TEXT NOT NULL,                   -- 联系人姓名
  contact_phone TEXT NOT NULL,                  -- 联系电话
  contact_email TEXT,                           -- 邮箱（可选）
  contact_wechat TEXT,                          -- 微信（可选）
  
  -- 预约信息
  preferred_time TEXT,                          -- 期望咨询时间
  preferred_time_slot TEXT,                     -- 'morning' | 'afternoon' | 'evening' | 'weekend'
  consultation_type TEXT NOT NULL,              -- 咨询类型
  
  -- 来源信息
  source_level TEXT,                            -- 来自分析的等级 A/B/C/D/E
  source_action TEXT,                           -- 推荐的行动类型
  
  -- 学生信息（快速记录）
  student_grade TEXT,                           -- 学生年级
  target_schools TEXT,                          -- 目标学校（JSON array）
  
  -- 备注
  notes TEXT,                                   -- 用户备注
  admin_notes TEXT,                             -- 管理员备注
  
  -- 状态管理
  status TEXT DEFAULT 'pending',                -- 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  assigned_to TEXT,                             -- 分配的顾问
  contacted_at TEXT,                            -- 首次联系时间
  completed_at TEXT,                            -- 完成时间
  
  -- 转化追踪
  is_converted INTEGER DEFAULT 0,               -- 是否转化 0/1
  converted_course TEXT,                        -- 转化的课程
  converted_amount REAL,                        -- 转化金额
  
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (analysis_id) REFERENCES analysis_records(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 推荐行动配置表
CREATE TABLE IF NOT EXISTS recommended_actions (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,                          -- A/B/C/D/E
  action_type TEXT NOT NULL,                    -- 'consultation' | 'course' | 'assessment'
  action_title TEXT NOT NULL,                   -- 行动标题
  action_description TEXT,                      -- 行动描述
  priority INTEGER DEFAULT 1,                   -- 优先级
  is_active INTEGER DEFAULT 1,                  -- 是否启用
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 咨询预约相关索引
CREATE INDEX IF NOT EXISTS idx_consultation_analysis ON consultation_bookings(analysis_id);
CREATE INDEX IF NOT EXISTS idx_consultation_user ON consultation_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_consultation_status ON consultation_bookings(status);
CREATE INDEX IF NOT EXISTS idx_consultation_type ON consultation_bookings(consultation_type);
CREATE INDEX IF NOT EXISTS idx_consultation_created ON consultation_bookings(created_at);
CREATE INDEX IF NOT EXISTS idx_consultation_converted ON consultation_bookings(is_converted);
CREATE INDEX IF NOT EXISTS idx_recommended_level ON recommended_actions(level);

-- 预置推荐行动数据
INSERT OR IGNORE INTO recommended_actions (id, level, action_type, action_title, action_description, priority) VALUES
  ('ra_a_1', 'A', 'consultation', '插班冲刺咨询', '您的孩子具备较好条件，建议预约专业顾问制定冲刺计划', 1),
  ('ra_a_2', 'A', 'course', '插班强化课程', '针对目标学校的强化训练，提升面试和笔试竞争力', 2),
  ('ra_b_1', 'B', 'consultation', '插班规划咨询', '具备插班机会，建议咨询顾问制定提升策略', 1),
  ('ra_b_2', 'B', 'course', '核心科目提升班', '重点提升英文/数学，增强竞争优势', 2),
  ('ra_c_1', 'C', 'consultation', '能力提升咨询', '建议先进行系统评估，制定3-6个月提升计划', 1),
  ('ra_c_2', 'C', 'course', '基础强化课程', '夯实基础，逐步提升各科成绩', 2),
  ('ra_d_1', 'D', 'consultation', '升学策略咨询', '建议重新评估目标，制定切实可行的升学方案', 1),
  ('ra_d_2', 'D', 'course', '基础重建方案', '从基础开始，系统性提升学习能力', 2),
  ('ra_e_1', 'E', 'consultation', '学习规划咨询', '建议进行全面评估，制定长期学习计划', 1),
  ('ra_e_2', 'E', 'course', '基础能力培养班', '重建学习基础，培养良好学习习惯', 2);
