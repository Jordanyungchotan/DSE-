#!/usr/bin/env python3
"""
Phase 2a: 将 CityU B 类课程 (WEIGHTED_DESCRIBED) 的文本加权信息
解析为结构化 subject_weights，升级为 A 类 (WEIGHTED_STRUCTURED)。

处理内容:
1. Pattern A 有真实加权 (Weighting: N，非全1) → 解析为 subject_weights → 升级 A 类
2. Pattern A 全部=1 → 降级为 SUBJECT_CONSTRAINED 或 SIMPLE
3. Pattern B (Weighting N: subjects) → 尝试交叉验证后解析

输出: phase2a_update.sql
"""

import json
import re
from typing import Optional

with open("jupas_scoring_formulas.json", "r") as f:
    data = json.load(f)


def determine_column_order(header_text: str, scoring_base: str) -> list:
    """
    根据 CityU 表头文本确定科目列顺序。
    
    CityU PDF 表格列顺序规则:
    - 第 1 列始终是 "Weighted" 科目（权重最高的科目）
    - 后续列为其他核心科 + 选修科
    - 核心科通常为: English Language, Chinese Language, Mathematics, Liberal Studies
    - 选修科标记为: Elective 1, Elective 2, ...
    
    文本提取时，多行表头被展平:
    "English Chinese Mathematics Weighted Language Language (Compulsory Part) Liberal Studies Elective 1..."
    实际含义: Col1=English Language(Weighted), Col2=Chinese Language, Col3=Mathematics, Col4=Liberal Studies, Col5=Elective
    """
    header_lower = header_text.lower()
    
    # 确定第一个科目（Weighted科目）
    # 在展平文本中，第一个出现的科目关键词 = Column 1 = Weighted 科目
    subject_positions = {}
    for keyword, name in [
        ('mathematics', 'math'),
        ('english', 'english'),
    ]:
        pos = header_lower.find(keyword)
        if pos >= 0:
            subject_positions[name] = pos
    
    if not subject_positions:
        return ['english', 'chinese', 'math', 'liberal_studies', 'other_elective']
    
    first_subj = min(subject_positions, key=subject_positions.get)
    
    # 根据 Weighted 科目确定列顺序
    if first_subj == 'english':
        # English 在前 → [English, Chinese, Math, Liberal Studies, Elective]
        cols = ['english', 'chinese', 'math', 'liberal_studies', 'other_elective']
    elif first_subj == 'math':
        # Mathematics 在前 → [Math, English, Chinese, Liberal Studies, Elective]
        cols = ['math', 'english', 'chinese', 'liberal_studies', 'other_elective']
    else:
        cols = ['english', 'chinese', 'math', 'liberal_studies', 'other_elective']
    
    # best_6 有 6 列
    if scoring_base == 'best_6':
        cols.append('other_elective_2')
    
    return cols


def parse_pattern_a(record: dict) -> Optional[dict]:
    """解析 CityU Pattern A: 'Weighting: N' 表格格式"""
    desc = record.get('formula_description', '')
    weights = re.findall(r'Weighting:\s*([\d.]+)', desc)
    
    if not weights:
        return None
    
    # 检查是否全部=1
    float_weights = [float(w) for w in weights]
    if all(w == 1.0 for w in float_weights):
        return None  # 全1，不是真实加权
    
    # 提取表头区域
    m = re.search(r'appropriate\)\s*(.*?)\s*(?:Admission Score|Weighting:)', desc, re.DOTALL)
    if not m:
        return None
    
    header = m.group(1).strip()
    cols = determine_column_order(header, record.get('scoring_base', 'best_5'))
    
    # 映射权重到科目
    subject_weights = {}
    for i, col in enumerate(cols):
        if i < len(float_weights):
            w = float_weights[i]
            if w != 1.0:
                subject_weights[col] = w
    
    return subject_weights if subject_weights else None


def parse_pattern_b(record: dict) -> Optional[dict]:
    """
    解析 CityU Pattern B: 'Weighting N: subject_list' 格式
    注意: 大部分 Pattern B 的科目列表被截断，需要交叉验证
    """
    desc = record.get('formula_description', '')
    
    # 尝试提取 "Weighting N: subjects"
    matches = re.findall(r'Weighting\s+([\d.]+):\s*(.+?)(?:\s+Median|\s+\d+\s|\s+Admission|\s*$)', desc)
    
    if not matches:
        return None
    
    subject_weights = {}
    for weight_str, subj_list in matches:
        weight = float(weight_str)
        if weight == 1.0:
            continue
        
        # 拆分科目列表
        subjects = [s.strip() for s in subj_list.split(',')]
        for subj in subjects:
            # 标准化科目名
            subj_lower = subj.lower().strip()
            if not subj_lower:
                continue
            
            if 'biology' in subj_lower:
                subject_weights['biology'] = weight
            elif 'chemistry' in subj_lower:
                subject_weights['chemistry'] = weight
            elif 'physics' in subj_lower:
                subject_weights['physics'] = weight
            elif 'combined science' in subj_lower:
                subject_weights['combined_science'] = weight
            elif 'ict' in subj_lower or 'information' in subj_lower:
                subject_weights['ict'] = weight
            elif 'm1' in subj_lower or 'm2' in subj_lower:
                subject_weights['m1_m2'] = weight
            elif 'economics' in subj_lower:
                subject_weights['economics'] = weight
            elif 'english' in subj_lower:
                subject_weights['english'] = weight
            elif 'chinese' in subj_lower:
                subject_weights['chinese'] = weight
            elif 'math' in subj_lower:
                subject_weights['math'] = weight
            elif 'design' in subj_lower:
                subject_weights['design_tech'] = weight
            elif 'literature' in subj_lower:
                subject_weights['literature_english'] = weight
            else:
                # 未知科目，用原始名
                subject_weights[subj_lower.replace(' ', '_')] = weight
    
    return subject_weights if subject_weights else None


def escape_sql(val):
    if val is None:
        return "NULL"
    if isinstance(val, (dict, list)):
        return "'" + json.dumps(val, ensure_ascii=False).replace("'", "''") + "'"
    if isinstance(val, (int, float)):
        return str(val)
    return "'" + str(val).replace("'", "''") + "'"


# ============================================================
# 主处理逻辑
# ============================================================

sql_lines = []
sql_lines.append("-- Phase 2a: B类 → A类 升级 + 全1降级")
sql_lines.append("-- Auto-generated by parse_b_to_a.py")
sql_lines.append("")

upgraded_a = 0      # B→A 升级数
downgraded = 0      # 全1→C/D 降级数
pattern_b_parsed = 0
skipped = 0

# 收集所有 CityU B-type records
b_cityu = [r for r in data
           if (not r.get('subject_weights') or r['subject_weights'] == {})
           and r['university'] == 'cityu'
           and re.search(r'[Ww]eight', r.get('formula_description', ''))]

print(f"CityU B-type 总计: {len(b_cityu)} 条")

for r in b_cityu:
    desc = r.get('formula_description', '')
    code = r['programme_code']
    year = r['year']
    
    # 优先尝试 Pattern A
    if 'Weighting:' in desc:
        weights_text = re.findall(r'Weighting:\s*([\d.]+)', desc)
        float_weights = [float(w) for w in weights_text]
        
        if all(w == 1.0 for w in float_weights):
            # 全部=1，降级
            # 判断降级到 C 还是 D
            has_constraint = r.get('include_english') or r.get('include_math') or (r.get('include_specific') and r['include_specific'] != '[]' and r['include_specific'] != [])
            new_type = 'SUBJECT_CONSTRAINED' if has_constraint else 'SIMPLE'
            
            sql_lines.append(
                f"UPDATE jupas_scoring_formulas SET scoring_type = '{new_type}' "
                f"WHERE programme_code = '{code}' AND year = {year};"
            )
            downgraded += 1
            print(f"  ↓ {code} ({year}): 全1 → {new_type}")
        else:
            # 有真实加权，解析
            parsed = parse_pattern_a(r)
            if parsed:
                sql_lines.append(
                    f"UPDATE jupas_scoring_formulas SET "
                    f"subject_weights = {escape_sql(parsed)}, "
                    f"scoring_type = 'WEIGHTED_STRUCTURED' "
                    f"WHERE programme_code = '{code}' AND year = {year};"
                )
                upgraded_a += 1
                print(f"  ↑ {code} ({year}): → A类 weights={parsed}")
            else:
                skipped += 1
                print(f"  ? {code} ({year}): Pattern A 解析失败")
    
    # 尝试 Pattern B
    elif re.search(r'Weighting\s+[\d.]+:', desc):
        parsed = parse_pattern_b(r)
        if parsed:
            sql_lines.append(
                f"UPDATE jupas_scoring_formulas SET "
                f"subject_weights = {escape_sql(parsed)}, "
                f"scoring_type = 'WEIGHTED_STRUCTURED' "
                f"WHERE programme_code = '{code}' AND year = {year};"
            )
            pattern_b_parsed += 1
            upgraded_a += 1
            print(f"  ↑ {code} ({year}): Pattern B → A类 weights={parsed}")
        else:
            skipped += 1
            print(f"  ? {code} ({year}): Pattern B 解析失败 (科目列表可能被截断)")
    
    # 其他 B-type (只有 'with weighting' 等模糊描述)
    else:
        skipped += 1
        print(f"  - {code} ({year}): 无法解析")

sql_lines.append("")
sql_lines.append(f"-- 统计: 升级A类={upgraded_a}, 降级={downgraded}, 跳过={skipped}")

# 写入 SQL 文件
with open("phase2a_update.sql", "w", encoding="utf-8") as f:
    f.write("\n".join(sql_lines))

print(f"\n{'='*50}")
print(f"Phase 2a 处理完成:")
print(f"  升级到 A 类: {upgraded_a} 条 (Pattern A: {upgraded_a - pattern_b_parsed}, Pattern B: {pattern_b_parsed})")
print(f"  降级 (全1): {downgraded} 条")
print(f"  跳过: {skipped} 条")
print(f"  SQL 文件: phase2a_update.sql ({len(sql_lines)} 行)")
