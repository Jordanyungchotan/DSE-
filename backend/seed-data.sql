-- DSE系统种子数据
-- 包含香港中学、大学专业和就业趋势数据

-- =====================
-- 香港中学数据 (示例数据)
-- =====================

INSERT OR IGNORE INTO hk_schools (id, name_zh, name_en, district, school_type, religion, funding_type, banding, address) VALUES
('sch001', '拔萃男书院', 'Diocesan Boys'' School', '九龙城区', 'boys', 'protestant', 'dss', 1, '九龙旺角亚皆老街131号'),
('sch002', '拔萃女书院', 'Diocesan Girls'' School', '油尖旺区', 'girls', 'protestant', 'dss', 1, '九龙佐敦道1号'),
('sch003', '喇沙书院', 'La Salle College', '九龙城区', 'boys', 'catholic', 'aided', 1, '九龙喇沙利道18号'),
('sch004', '圣保罗男女中学', 'St. Paul''s Co-educational College', '中西区', 'coed', 'protestant', 'dss', 1, '香港麦当劳道33号'),
('sch005', '皇仁书院', 'Queen''s College', '湾仔区', 'boys', 'none', 'government', 1, '香港铜锣湾高士威道120号'),
('sch006', '英皇书院', 'King''s College', '中西区', 'boys', 'none', 'government', 1, '香港西环般咸道63号A'),
('sch007', '华仁书院(九龙)', 'Wah Yan College Kowloon', '油尖旺区', 'boys', 'catholic', 'aided', 1, '九龙窝打老道56号'),
('sch008', '圣若瑟书院', 'St. Joseph''s College', '中西区', 'boys', 'catholic', 'aided', 1, '香港坚尼地道7号'),
('sch009', '协恩中学', 'Heep Yunn School', '九龙城区', 'girls', 'protestant', 'dss', 1, '九龙农圃道1号'),
('sch010', '圣保禄学校', 'St. Paul''s Convent School', '湾仔区', 'girls', 'catholic', 'dss', 1, '香港铜锣湾礼顿道140号'),
('sch011', '玛利诺修院学校', 'Maryknoll Convent School', '九龙城区', 'girls', 'catholic', 'aided', 1, '九龙窝打老道130号'),
('sch012', '圣士提反女子中学', 'St. Stephen''s Girls'' College', '中西区', 'girls', 'protestant', 'aided', 1, '香港列堤顿道2号'),
('sch013', '香港华仁书院', 'Wah Yan College Hong Kong', '湾仔区', 'boys', 'catholic', 'aided', 1, '香港皇后大道东281号'),
('sch014', '圣公会曾肇添中学', 'SKH Tsang Shiu Tim Secondary School', '沙田区', 'coed', 'protestant', 'aided', 1, '沙田禾輋邨德厚街6号'),
('sch015', '浸信会吕明才中学', 'Baptist Lui Ming Choi Secondary School', '沙田区', 'coed', 'protestant', 'aided', 1, '沙田圆洲角路8号'),
('sch016', '圣保罗书院', 'St. Paul''s College', '中西区', 'boys', 'protestant', 'dss', 1, '香港般咸道67-69号'),
('sch017', '英华女学校', 'Ying Wa Girls'' School', '中西区', 'girls', 'protestant', 'aided', 1, '香港罗便臣道76号'),
('sch018', '真光女书院', 'True Light Girls'' College', '油尖旺区', 'girls', 'protestant', 'aided', 1, '九龙窝打老道54号A'),
('sch019', '庇理罗士女子中学', 'Belilios Public School', '湾仔区', 'girls', 'none', 'government', 1, '香港天后庙道51号'),
('sch020', '何明华会督银禧中学', 'Bishop Hall Jubilee School', '九龙城区', 'coed', 'protestant', 'aided', 1, '九龙九龙塘牛津道1号B');

-- =====================
-- 大学专业数据
-- =====================

-- 香港大学
INSERT OR IGNORE INTO university_programs (id, university_code, university_name_zh, university_name_en, program_code, program_name_zh, program_name_en, category, jupas_code, min_score_2024, median_score_2024, average_starting_salary) VALUES
('hku001', 'HKU', '香港大学', 'The University of Hong Kong', 'MBBS', '内外全科医学士', 'Bachelor of Medicine and Bachelor of Surgery', 'medicine', 'JS6107', 38, 40, 75000),
('hku002', 'HKU', '香港大学', 'The University of Hong Kong', 'LAW', '法学士', 'Bachelor of Laws', 'law', 'JS6066', 36, 38, 50000),
('hku003', 'HKU', '香港大学', 'The University of Hong Kong', 'BBA', '工商管理学士', 'Bachelor of Business Administration', 'business', 'JS6781', 28, 32, 25000),
('hku004', 'HKU', '香港大学', 'The University of Hong Kong', 'BENG', '工程学士', 'Bachelor of Engineering', 'engineering', 'JS6963', 26, 30, 22000),
('hku005', 'HKU', '香港大学', 'The University of Hong Kong', 'BSC', '理学士', 'Bachelor of Science', 'science', 'JS6901', 25, 28, 20000),
('hku006', 'HKU', '香港大学', 'The University of Hong Kong', 'BA', '文学士', 'Bachelor of Arts', 'arts', 'JS6054', 24, 27, 18000),
('hku007', 'HKU', '香港大学', 'The University of Hong Kong', 'BARCH', '建筑学士', 'Bachelor of Arts in Architectural Studies', 'architecture', 'JS6896', 30, 33, 20000),
('hku008', 'HKU', '香港大学', 'The University of Hong Kong', 'BDS', '牙医学士', 'Bachelor of Dental Surgery', 'medicine', 'JS6157', 37, 39, 70000);

-- 香港中文大学
INSERT OR IGNORE INTO university_programs (id, university_code, university_name_zh, university_name_en, program_code, program_name_zh, program_name_en, category, jupas_code, min_score_2024, median_score_2024, average_starting_salary) VALUES
('cuhk001', 'CUHK', '香港中文大学', 'The Chinese University of Hong Kong', 'MBCHB', '内外全科医学士', 'Bachelor of Medicine and Bachelor of Surgery', 'medicine', 'JS4401', 37, 39, 75000),
('cuhk002', 'CUHK', '香港中文大学', 'The Chinese University of Hong Kong', 'LAW', '法学士', 'Bachelor of Laws', 'law', 'JS4225', 35, 37, 48000),
('cuhk003', 'CUHK', '香港中文大学', 'The Chinese University of Hong Kong', 'IBBA', '工商管理学士(环球)', 'Global Business Studies', 'business', 'JS4733', 32, 35, 30000),
('cuhk004', 'CUHK', '香港中文大学', 'The Chinese University of Hong Kong', 'QFIN', '计量金融学', 'Quantitative Finance', 'business', 'JS4719', 30, 33, 28000),
('cuhk005', 'CUHK', '香港中文大学', 'The Chinese University of Hong Kong', 'CSCI', '计算机科学', 'Computer Science', 'engineering', 'JS4468', 28, 31, 25000),
('cuhk006', 'CUHK', '香港中文大学', 'The Chinese University of Hong Kong', 'SEEM', '系统工程与工程管理', 'Systems Engineering and Engineering Management', 'engineering', 'JS4526', 26, 29, 22000);

-- 香港科技大学
INSERT OR IGNORE INTO university_programs (id, university_code, university_name_zh, university_name_en, program_code, program_name_zh, program_name_en, category, jupas_code, min_score_2024, median_score_2024, average_starting_salary) VALUES
('ust001', 'UST', '香港科技大学', 'The Hong Kong University of Science and Technology', 'QFIN', '计量金融学', 'Quantitative Finance', 'business', 'JS5313', 32, 35, 30000),
('ust002', 'UST', '香港科技大学', 'The Hong Kong University of Science and Technology', 'COMP', '计算机科学', 'Computer Science', 'engineering', 'JS5181', 29, 32, 26000),
('ust003', 'UST', '香港科技大学', 'The Hong Kong University of Science and Technology', 'BBA', '工商管理学士', 'Business and Management', 'business', 'JS5312', 27, 30, 24000),
('ust004', 'UST', '香港科技大学', 'The Hong Kong University of Science and Technology', 'BENG', '工程学', 'Engineering', 'engineering', 'JS5200', 25, 28, 22000),
('ust005', 'UST', '香港科技大学', 'The Hong Kong University of Science and Technology', 'BSC', '理学', 'Science', 'science', 'JS5101', 24, 27, 20000);

-- 香港理工大学
INSERT OR IGNORE INTO university_programs (id, university_code, university_name_zh, university_name_en, program_code, program_name_zh, program_name_en, category, jupas_code, min_score_2024, median_score_2024, average_starting_salary) VALUES
('polyu001', 'POLYU', '香港理工大学', 'The Hong Kong Polytechnic University', 'RAD', '放射学', 'Radiography', 'health', 'JS3612', 26, 29, 28000),
('polyu002', 'POLYU', '香港理工大学', 'The Hong Kong Polytechnic University', 'NURS', '护理学', 'Nursing', 'health', 'JS3636', 24, 27, 30000),
('polyu003', 'POLYU', '香港理工大学', 'The Hong Kong Polytechnic University', 'COMP', '计算学', 'Computing', 'engineering', 'JS3868', 24, 27, 22000),
('polyu004', 'POLYU', '香港理工大学', 'The Hong Kong Polytechnic University', 'HOTEL', '酒店及旅游管理', 'Hotel and Tourism Management', 'business', 'JS3569', 23, 26, 20000);

-- =====================
-- 就业趋势数据
-- =====================

INSERT OR IGNORE INTO employment_trends (id, industry, industry_zh, growth_rate, average_salary, entry_salary, demand_level, future_outlook, ai_impact, required_skills, related_majors) VALUES
('trend001', 'fintech', '金融科技', 15.2, 45000, 25000, 'high', 'growing', 'positive', '["Python", "数据分析", "区块链", "机器学习"]', '["计算机科学", "计量金融", "数学"]'),
('trend002', 'healthcare', '医疗健康', 8.5, 55000, 35000, 'high', 'growing', 'neutral', '["临床技能", "生物科技", "数据分析"]', '["医学", "护理", "生物科技"]'),
('trend003', 'ai_tech', '人工智能', 22.3, 50000, 28000, 'high', 'growing', 'positive', '["机器学习", "深度学习", "Python", "数据科学"]', '["计算机科学", "数据科学", "数学"]'),
('trend004', 'legal', '法律服务', 3.2, 48000, 25000, 'medium', 'stable', 'neutral', '["法律研究", "谈判技巧", "文书写作"]', '["法学", "商业法"]'),
('trend005', 'accounting', '会计审计', 2.8, 32000, 18000, 'medium', 'stable', 'negative', '["财务分析", "审计", "税务"]', '["会计", "财务", "商业"]'),
('trend006', 'engineering', '工程技术', 6.5, 35000, 22000, 'high', 'growing', 'positive', '["工程设计", "项目管理", "CAD"]', '["工程学", "土木工程", "机械工程"]'),
('trend007', 'marketing', '市场营销', 5.8, 28000, 16000, 'medium', 'growing', 'neutral', '["数字营销", "数据分析", "创意设计"]', '["市场学", "商业", "传媒"]'),
('trend008', 'education', '教育培训', 4.2, 35000, 25000, 'medium', 'stable', 'neutral', '["教学技能", "课程设计", "学科知识"]', '["教育", "各学科专业"]'),
('trend009', 'real_estate', '房地产', -2.5, 38000, 18000, 'low', 'declining', 'neutral', '["销售技巧", "市场分析", "谈判"]', '["商业", "地产管理"]'),
('trend010', 'sustainability', '可持续发展', 18.5, 32000, 20000, 'high', 'growing', 'positive', '["环境科学", "政策分析", "数据分析"]', '["环境科学", "工程学", "公共政策"]');

