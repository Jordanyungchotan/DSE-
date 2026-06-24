-- JUPAS 课程计分公式表 (精简版，适用于 D1)
-- 每条记录代表一个课程某一年的计分规则

DROP TABLE IF EXISTS jupas_scoring_formulas;

CREATE TABLE jupas_scoring_formulas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_code TEXT NOT NULL,
  programme_name TEXT,
  university TEXT NOT NULL,
  year INTEGER NOT NULL,
  scoring_base TEXT NOT NULL DEFAULT 'best_5',
  include_english INTEGER DEFAULT 0,
  include_math INTEGER DEFAULT 0,
  include_specific TEXT DEFAULT '[]',
  subject_weights TEXT DEFAULT '{}',
  sixth_subject_bonus REAL DEFAULT 0,
  highest_attainable REAL,
  median REAL,
  lower_quartile REAL,
  upper_quartile REAL,
  formula_description TEXT,
  scoring_type TEXT DEFAULT 'SIMPLE',
  UNIQUE(programme_code, year)
);

CREATE INDEX idx_sf_code ON jupas_scoring_formulas(programme_code);
CREATE INDEX idx_sf_university ON jupas_scoring_formulas(university);
CREATE INDEX idx_sf_year ON jupas_scoring_formulas(year);
CREATE INDEX idx_sf_type ON jupas_scoring_formulas(scoring_type);
