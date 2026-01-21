-- =============================================
-- 积分转化闘环升级：咨询兑换 + 排名解锁
-- =============================================

-- 更新商品表：添加排名解锁和商品类型字段
ALTER TABLE point_mall_items ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'NORMAL';
-- item_type: NORMAL（普通）, VIP（前3名专属）, TOP10（前10名专属）, CONSULTATION（咨询类）

ALTER TABLE point_mall_items ADD COLUMN IF NOT EXISTS min_rank INTEGER DEFAULT 0;
-- min_rank: 0 = 无限制，1-3 = 前3名，1-10 = 前10名

ALTER TABLE point_mall_items ADD COLUMN IF NOT EXISTS consultation_type TEXT;
-- consultation_type: COURSE_PLANNING（课程规划）, CAREER_ADVICE（升学咨询）, STUDY_PLAN（学习计划）

-- 咨询转化追踪表
CREATE TABLE IF NOT EXISTS consultation_conversions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  redemption_id TEXT NOT NULL,
  consultation_type TEXT NOT NULL,
  -- 咨询状态：REDEEMED（已兑换）, SCHEDULED（已预约）, COMPLETED（已完成）, CONVERTED（已成单）
  status TEXT DEFAULT 'REDEEMED',
  -- 预约时间
  scheduled_at TEXT,
  -- 完成时间
  completed_at TEXT,
  -- 是否成单
  is_converted INTEGER DEFAULT 0,
  -- 成单金额（如有）
  conversion_amount REAL,
  -- 成单时间
  converted_at TEXT,
  -- 顾问 ID
  consultant_id TEXT,
  -- 顾问备注
  consultant_notes TEXT,
  -- 用户评分（1-5）
  user_rating INTEGER,
  -- 用户反馈
  user_feedback TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (redemption_id) REFERENCES point_redemptions(id) ON DELETE CASCADE
);

-- 转化漏斗统计视图
CREATE VIEW IF NOT EXISTS v_conversion_funnel AS
SELECT 
  DATE(pr.created_at) as date,
  COUNT(DISTINCT pr.id) as total_redemptions,
  COUNT(DISTINCT CASE WHEN cc.status IN ('SCHEDULED', 'COMPLETED', 'CONVERTED') THEN cc.id END) as scheduled_count,
  COUNT(DISTINCT CASE WHEN cc.status IN ('COMPLETED', 'CONVERTED') THEN cc.id END) as completed_count,
  COUNT(DISTINCT CASE WHEN cc.is_converted = 1 THEN cc.id END) as converted_count,
  SUM(CASE WHEN cc.is_converted = 1 THEN cc.conversion_amount ELSE 0 END) as total_conversion_amount
FROM point_redemptions pr
JOIN point_mall_items pmi ON pmi.id = pr.item_id
LEFT JOIN consultation_conversions cc ON cc.redemption_id = pr.id
WHERE pmi.item_type = 'CONSULTATION'
GROUP BY DATE(pr.created_at);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversion_user ON consultation_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_status ON consultation_conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversion_consultant ON consultation_conversions(consultant_id);
CREATE INDEX IF NOT EXISTS idx_mall_items_type ON point_mall_items(item_type);
CREATE INDEX IF NOT EXISTS idx_mall_items_rank ON point_mall_items(min_rank);

-- 预置咨询类商品
INSERT OR IGNORE INTO point_mall_items (id, name_zh, name_en, description_zh, description_en, category, required_points, item_type, consultation_type, min_rank, is_active) VALUES
  ('consultation-course-planning', '课程规划咨询', 'Course Planning Consultation', '1对1专业老师课程规划咨询，帮助制定个性化学习方案', '1-on-1 course planning consultation with professional teachers', 'CONSULTATION', 500, 'CONSULTATION', 'COURSE_PLANNING', 0, 1),
  ('consultation-career-advice', '升学咨询', 'Career Advice Consultation', '专业升学指导，了解DSE升学路径和大学选择', 'Professional career guidance for DSE pathways', 'CONSULTATION', 800, 'CONSULTATION', 'CAREER_ADVICE', 0, 1),
  ('consultation-vip-study-plan', 'VIP 学习计划定制', 'VIP Study Plan', '仅限排行榜前3名兑换，享受专属学习计划定制服务', 'Exclusive for Top 3 rankers, personalized study plan', 'CONSULTATION', 300, 'VIP', 'STUDY_PLAN', 3, 1);
