#!/usr/bin/env python3
"""
将 jupas_scoring_formulas.json 转换为 D1 可执行的 SQL 文件
自动分类 scoring_type: WEIGHTED_STRUCTURED / WEIGHTED_DESCRIBED / SUBJECT_CONSTRAINED / SIMPLE
"""

import json
import re

with open("jupas_scoring_formulas.json", "r") as f:
    data = json.load(f)

def classify(record):
    """自动分类 ProgrammeScoringType"""
    sw = record.get("subject_weights", {})
    if isinstance(sw, str):
        try: sw = json.loads(sw)
        except: sw = {}
    
    desc = record.get("formula_description", "")
    has_structured_weights = bool(sw and sw != {})
    has_weighting_desc = bool(re.search(r"[Ww]eight(ing|ed)", desc))
    has_constraints = bool(
        record.get("include_english") or 
        record.get("include_math") or 
        (record.get("include_specific") and record["include_specific"] != [])
    )
    
    if has_structured_weights:
        return "WEIGHTED_STRUCTURED"
    elif has_weighting_desc:
        return "WEIGHTED_DESCRIBED"
    elif has_constraints:
        return "SUBJECT_CONSTRAINED"
    else:
        return "SIMPLE"

def escape(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "1" if val else "0"
    if isinstance(val, (int, float)):
        return str(val)
    if isinstance(val, (dict, list)):
        return "'" + json.dumps(val, ensure_ascii=False).replace("'", "''") + "'"
    return "'" + str(val).replace("'", "''") + "'"

lines = []
lines.append("-- Auto-generated: JUPAS scoring formulas import")
lines.append(f"-- Total: {len(data)} records")
lines.append("")

# 统计
type_counts = {"WEIGHTED_STRUCTURED": 0, "WEIGHTED_DESCRIBED": 0, "SUBJECT_CONSTRAINED": 0, "SIMPLE": 0}

for record in data:
    scoring_type = classify(record)
    type_counts[scoring_type] += 1
    
    sw = record.get("subject_weights", {})
    if isinstance(sw, str):
        try: sw = json.loads(sw)
        except: sw = {}
    
    inc_spec = record.get("include_specific", [])
    if isinstance(inc_spec, str):
        try: inc_spec = json.loads(inc_spec)
        except: inc_spec = []
    
    vals = [
        escape(record.get("programme_code", "")),
        escape(record.get("programme_name", "")),
        escape(record.get("university", "")),
        escape(record.get("year", 2025)),
        escape(record.get("scoring_base", "best_5")),
        "1" if record.get("include_english") else "0",
        "1" if record.get("include_math") else "0",
        escape(inc_spec),
        escape(sw),
        escape(record.get("sixth_subject_bonus", 0)),
        escape(record.get("highest_attainable")),
        escape(record.get("median")),
        escape(record.get("lower_quartile")),
        escape(record.get("upper_quartile")),
        escape(record.get("formula_description", "")),
        escape(scoring_type),
    ]
    
    lines.append(
        "INSERT OR REPLACE INTO jupas_scoring_formulas "
        "(programme_code, programme_name, university, year, scoring_base, "
        "include_english, include_math, include_specific, subject_weights, "
        "sixth_subject_bonus, highest_attainable, median, lower_quartile, "
        "upper_quartile, formula_description, scoring_type) VALUES "
        f"({', '.join(vals)});"
    )

with open("import_scoring_formulas.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"生成完成: import_scoring_formulas.sql")
print(f"总计: {len(data)} 条")
print(f"分类统计:")
for t, c in type_counts.items():
    print(f"  {t}: {c}")
