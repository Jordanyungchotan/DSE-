#!/usr/bin/env python3
"""
JUPAS PDF 解析器
解析 JUPAS 录取分数 PDF 文件，提取课程代码、计分公式和录取分数
"""

import pdfplumber
import re
import json
import os
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path

@dataclass
class ScoringFormula:
    """计分公式"""
    programme_code: str
    programme_name: str
    year: int
    university: str
    
    # 计分基础
    scoring_base: str  # 'best_5', 'best_6', '3core_2elec', 'best_5_plus_6th_bonus'
    include_english: bool
    include_math: bool
    include_specific: List[str]  # 其他必须包含的科目
    
    # 科目加权
    subject_weights: Dict[str, float]
    
    # 第6科加分
    sixth_subject_bonus: float
    
    # 分数
    highest_attainable: Optional[float]
    median: Optional[float]
    lower_quartile: Optional[float]
    upper_quartile: Optional[float]
    
    # 原文描述
    formula_description: str
    notes: str

# 大学代码映射
UNIVERSITY_MAP = {
    "City University": "cityu",
    "Hong Kong Baptist University": "hkbu",
    "Lingnan University": "lu",
    "Chinese University": "cuhk",
    "Education University": "edu",
    "Polytechnic University": "polyu",
    "University of Science and Technology": "hkust",
    "University of Hong Kong": "hku",
    "Metropolitan University": "hkmu"
}

# 分数换算表
SCORE_CONVERSIONS = {
    "default": {"5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1},
    "cityu_2025": {"5**": 8.5, "5*": 7, "5": 5.5, "4": 4, "3": 3, "2": 2, "1": 1}
}

def detect_university(text: str) -> str:
    """检测页面所属大学"""
    for uni_name, code in UNIVERSITY_MAP.items():
        if uni_name.lower() in text.lower():
            return code
    return "unknown"

def parse_scoring_base(text: str) -> Tuple[str, bool, bool, List[str]]:
    """解析计分基础"""
    text_lower = text.lower()
    
    include_english = "english" in text_lower or "include english" in text_lower
    include_math = "mathematics" in text_lower or "include math" in text_lower
    include_specific = []
    
    # 检测必须包含的科目
    if "biology" in text_lower:
        include_specific.append("biology")
    if "chemistry" in text_lower:
        include_specific.append("chemistry")
    if "physics" in text_lower:
        include_specific.append("physics")
    if "m1/m2" in text_lower or "m1/ m2" in text_lower:
        include_specific.append("m1_m2")
    
    # 确定计分基础
    if "3 core + 2 elective" in text_lower or "3core + 2elec" in text_lower:
        scoring_base = "3core_2elec"
    elif "best 6" in text_lower:
        scoring_base = "best_6"
    elif "best 5" in text_lower:
        if "6th subject bonus" in text_lower:
            scoring_base = "best_5_plus_6th_bonus"
        else:
            scoring_base = "best_5"
    elif "4+2" in text_lower or "4 + 2" in text_lower:
        scoring_base = "4_plus_2"
    else:
        scoring_base = "best_5"
    
    return scoring_base, include_english, include_math, include_specific

def parse_subject_weights(text: str) -> Dict[str, float]:
    """解析科目加权"""
    weights = {}
    
    # 匹配格式如 "2: English / Mathematics" 或 "1.5: English"
    pattern = r'([\d.]+)\s*:\s*([^/\n]+(?:\s*/\s*[^/\n]+)*)'
    matches = re.findall(pattern, text)
    
    for weight, subjects in matches:
        weight_val = float(weight)
        # 分割科目
        subject_list = [s.strip() for s in subjects.split('/')]
        for subj in subject_list:
            subj_clean = subj.strip().lower()
            if subj_clean:
                # 标准化科目名称
                if "english" in subj_clean:
                    weights["english"] = weight_val
                elif "chinese" in subj_clean:
                    weights["chinese"] = weight_val
                elif "math" in subj_clean:
                    weights["math"] = weight_val
                elif "physics" in subj_clean:
                    weights["physics"] = weight_val
                elif "biology" in subj_clean:
                    weights["biology"] = weight_val
                elif "chemistry" in subj_clean:
                    weights["chemistry"] = weight_val
                elif "m1" in subj_clean or "m2" in subj_clean:
                    weights["m1_m2"] = weight_val
                elif "ict" in subj_clean or "information" in subj_clean:
                    weights["ict"] = weight_val
                elif "other" in subj_clean or "elective" in subj_clean:
                    weights["other_elective"] = weight_val
    
    return weights

def parse_hkust_engineering_formula(text: str) -> Dict[str, float]:
    """解析科大工程学院2026年新公式"""
    weights = {}
    
    # 匹配 "English x2 + Math x2 + 3 subjects in specific weighting + 6th subject bonus"
    if "English x2" in text or "english x2" in text.lower():
        weights["english"] = 2.0
    if "Math x2" in text or "math x2" in text.lower():
        weights["math"] = 2.0
    
    # 默认其他科目权重为1
    weights["other"] = 1.0
    
    return weights

def extract_programmes_from_page(page_text: str, year: int, university: str) -> List[ScoringFormula]:
    """从页面提取课程信息"""
    programmes = []
    
    # 匹配课程代码和名称 (JS开头的代码)
    # 格式1: JS1211 BEng Biomedical Engineering
    # 格式2: JS1211\nBEng Biomedical Engineering
    code_pattern = r'(JS\d{4})\s*\n?([A-Za-z][^\n]+?)(?=\n|Best|3 core|Lower|\d+\.\d+|\d+ \d+)'
    
    # 尝试提取表格数据
    lines = page_text.split('\n')
    
    current_code = None
    current_name = None
    current_formula = ""
    current_weights = ""
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # 检测课程代码
        code_match = re.match(r'^(JS\d{4})\b', line)
        if code_match:
            # 保存上一个课程
            if current_code:
                scoring_base, inc_eng, inc_math, inc_spec = parse_scoring_base(current_formula)
                weights = parse_subject_weights(current_weights)
                
                # 尝试提取分数
                median = None
                lower_q = None
                
                programmes.append(ScoringFormula(
                    programme_code=current_code,
                    programme_name=current_name or "",
                    year=year,
                    university=university,
                    scoring_base=scoring_base,
                    include_english=inc_eng,
                    include_math=inc_math,
                    include_specific=inc_spec,
                    subject_weights=weights,
                    sixth_subject_bonus=0.5 if "6th" in current_formula.lower() else 0,
                    highest_attainable=None,
                    median=median,
                    lower_quartile=lower_q,
                    upper_quartile=None,
                    formula_description=current_formula,
                    notes=current_weights
                ))
            
            current_code = code_match.group(1)
            # 名称可能在同一行或下一行
            remaining = line[len(current_code):].strip()
            if remaining:
                current_name = remaining
            elif i + 1 < len(lines):
                current_name = lines[i + 1].strip()
            current_formula = ""
            current_weights = ""
        
        # 累积公式描述
        if current_code:
            if "Best" in line or "core" in line or "subjects" in line.lower():
                current_formula += " " + line
            if re.search(r'[\d.]+\s*:', line):
                current_weights += " " + line
    
    # 保存最后一个课程
    if current_code:
        scoring_base, inc_eng, inc_math, inc_spec = parse_scoring_base(current_formula)
        weights = parse_subject_weights(current_weights)
        
        programmes.append(ScoringFormula(
            programme_code=current_code,
            programme_name=current_name or "",
            year=year,
            university=university,
            scoring_base=scoring_base,
            include_english=inc_eng,
            include_math=inc_math,
            include_specific=inc_spec,
            subject_weights=weights,
            sixth_subject_bonus=0.5 if "6th" in current_formula.lower() else 0,
            highest_attainable=None,
            median=None,
            lower_quartile=None,
            upper_quartile=None,
            formula_description=current_formula,
            notes=current_weights
        ))
    
    return programmes

def parse_table_data(pdf_path: str, year: int) -> List[ScoringFormula]:
    """使用表格提取方式解析PDF"""
    all_programmes = []
    
    with pdfplumber.open(pdf_path) as pdf:
        current_university = None
        
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            
            # 检测大学
            for uni_name, code in UNIVERSITY_MAP.items():
                if uni_name in text:
                    current_university = code
                    break
            
            if not current_university:
                continue
            
            # 提取表格
            tables = page.extract_tables()
            
            for table in tables:
                if not table:
                    continue
                
                for row in table:
                    if not row:
                        continue
                    
                    # 查找包含课程代码的单元格
                    for cell in row:
                        if cell and re.match(r'^JS\d{4}', str(cell).strip()):
                            code = re.match(r'^(JS\d{4})', str(cell).strip()).group(1)
                            
                            # 提取其他列的数据
                            programme_name = ""
                            formula_desc = ""
                            weights_desc = ""
                            median = None
                            lower_q = None
                            highest = None
                            
                            for c in row:
                                if c:
                                    c_str = str(c).strip()
                                    # 名称通常在代码后面
                                    if c_str.startswith(code):
                                        programme_name = c_str[len(code):].strip()
                                    # 检测公式描述
                                    if "Best" in c_str or "core" in c_str:
                                        formula_desc = c_str
                                    # 检测权重
                                    if re.search(r'[\d.]+\s*:', c_str):
                                        weights_desc = c_str
                                    # 检测数字（分数）
                                    num_match = re.match(r'^[\d.]+$', c_str)
                                    if num_match:
                                        val = float(c_str)
                                        if highest is None:
                                            highest = val
                                        elif median is None:
                                            median = val
                                        elif lower_q is None:
                                            lower_q = val
                            
                            scoring_base, inc_eng, inc_math, inc_spec = parse_scoring_base(formula_desc)
                            weights = parse_subject_weights(weights_desc)
                            
                            all_programmes.append(ScoringFormula(
                                programme_code=code,
                                programme_name=programme_name,
                                year=year,
                                university=current_university,
                                scoring_base=scoring_base,
                                include_english=inc_eng,
                                include_math=inc_math,
                                include_specific=inc_spec,
                                subject_weights=weights,
                                sixth_subject_bonus=0.5 if "6th" in formula_desc.lower() else 0,
                                highest_attainable=highest,
                                median=median,
                                lower_quartile=lower_q,
                                upper_quartile=None,
                                formula_description=formula_desc,
                                notes=weights_desc
                            ))
                            break
    
    return all_programmes

def parse_with_regex(pdf_path: str, year: int) -> List[Dict]:
    """使用正则表达式直接从文本解析"""
    results = []
    
    with pdfplumber.open(pdf_path) as pdf:
        current_university = None
        
        for page_num, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            
            # 检测大学
            for uni_name, code in UNIVERSITY_MAP.items():
                if uni_name in text:
                    current_university = code
                    break
            
            if not current_university:
                continue
            
            # 港大特殊处理 - 使用4位数代码 (6004, 6016等)
            if current_university == "hku":
                # 匹配格式: 6004 Bachelor of Arts in Architectural Studies Best 5 Subjects a 32 29 28
                lines = text.split('\n')
                for line in lines:
                    # 港大代码是4位数字开头
                    hku_match = re.match(r'^(\d{4})\s+([A-Za-z][^\d]+?)\s+(Best\s+\d+|[\d.]+\s*x|Eng|Chin|Math)', line)
                    if hku_match:
                        code = "JS" + hku_match.group(1)  # 转换为JS格式
                        name = hku_match.group(2).strip()
                        remaining = line[hku_match.end(2):]
                        
                        # 提取公式和分数
                        formula_match = re.search(r'(Best\s+\d+[^0-9]*|[\d.]+\s*x[^0-9]+)', remaining)
                        formula_desc = formula_match.group(0) if formula_match else ""
                        
                        # 提取数字（分数）
                        numbers = re.findall(r'\b(\d+)\b', remaining)
                        numbers = [int(n) for n in numbers if 10 < int(n) < 100]
                        
                        upper_q = numbers[0] if len(numbers) > 0 else None
                        median = numbers[1] if len(numbers) > 1 else None
                        lower_q = numbers[2] if len(numbers) > 2 else None
                        
                        scoring_base, inc_eng, inc_math, inc_spec = parse_scoring_base(remaining)
                        weights = parse_subject_weights(remaining)
                        
                        results.append({
                            "programme_code": code,
                            "programme_name": name,
                            "year": year,
                            "university": current_university,
                            "scoring_base": scoring_base,
                            "include_english": inc_eng or "Eng" in remaining,
                            "include_math": inc_math or "Math" in remaining,
                            "include_specific": inc_spec,
                            "subject_weights": weights,
                            "sixth_subject_bonus": 0.5 if "6th" in remaining.lower() or "7th" in remaining.lower() else 0,
                            "highest_attainable": None,
                            "median": median,
                            "lower_quartile": lower_q,
                            "upper_quartile": upper_q,
                            "formula_description": remaining.strip()[:300],
                            "notes": ""
                        })
                continue  # 港大处理完毕，跳到下一页
            
            # 科大特殊处理 - 工程学院2026新公式
            if current_university == "hkust" and "SIMULATED SCORE" in text:
                # 解析科大工程学院的模拟分数表
                # 格式: JS5240 Department of Computer Science & Engineering 80.33 50 48
                pattern = r'(JS\d{4})\s+([A-Za-z][^0-9]+?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)'
                matches = re.findall(pattern, text)
                
                for match in matches:
                    code, name, highest, median, lower_q = match
                    results.append({
                        "programme_code": code.strip(),
                        "programme_name": name.strip(),
                        "year": year,
                        "university": current_university,
                        "scoring_base": "eng_x2_math_x2_plus_3_plus_6th",
                        "include_english": True,
                        "include_math": True,
                        "include_specific": [],
                        "subject_weights": {"english": 2, "math": 2, "other": 1},
                        "sixth_subject_bonus": 0.5,
                        "highest_attainable": float(highest),
                        "median": float(median),
                        "lower_quartile": float(lower_q),
                        "upper_quartile": None,
                        "formula_description": "English x2 + Math x2 + 3 subjects in specific weighting + 6th subject bonus",
                        "notes": "2026 School of Engineering simulated scores",
                        "is_simulated": True
                    })
            
            # 通用表格格式解析
            # 匹配行格式: JS代码 名称 Best X subjects 权重 分数1 分数2
            lines = text.split('\n')
            
            i = 0
            while i < len(lines):
                line = lines[i].strip()
                code_match = re.match(r'^(JS\d{4})\b', line)
                
                if code_match:
                    code = code_match.group(1)
                    name = line[len(code):].strip()
                    
                    # 收集后续几行的信息
                    formula_lines = []
                    numbers = []
                    
                    for j in range(i, min(i + 6, len(lines))):
                        l = lines[j].strip()
                        formula_lines.append(l)
                        # 提取数字
                        nums = re.findall(r'\b(\d+\.?\d*)\b', l)
                        for n in nums:
                            try:
                                val = float(n)
                                if 10 < val < 100:  # 分数范围
                                    numbers.append(val)
                            except:
                                pass
                    
                    combined = ' '.join(formula_lines)
                    scoring_base, inc_eng, inc_math, inc_spec = parse_scoring_base(combined)
                    weights = parse_subject_weights(combined)
                    
                    # 确定分数
                    highest = numbers[0] if len(numbers) > 0 else None
                    median = numbers[1] if len(numbers) > 1 else None
                    lower_q = numbers[2] if len(numbers) > 2 else None
                    
                    # 如果highest太高可能是最高可达分
                    if highest and highest > 60:
                        median = numbers[1] if len(numbers) > 1 else None
                        lower_q = numbers[2] if len(numbers) > 2 else None
                    elif highest and median and highest < median:
                        # 交换
                        highest, median = median, highest
                    
                    results.append({
                        "programme_code": code,
                        "programme_name": name,
                        "year": year,
                        "university": current_university,
                        "scoring_base": scoring_base,
                        "include_english": inc_eng,
                        "include_math": inc_math,
                        "include_specific": inc_spec,
                        "subject_weights": weights,
                        "sixth_subject_bonus": 0.5 if "6th" in combined.lower() else 0,
                        "highest_attainable": highest,
                        "median": median,
                        "lower_quartile": lower_q,
                        "upper_quartile": None,
                        "formula_description": combined[:500],
                        "notes": ""
                    })
                
                i += 1
    
    # 去重
    seen = set()
    unique_results = []
    for r in results:
        key = (r["programme_code"], r["year"])
        if key not in seen:
            seen.add(key)
            unique_results.append(r)
    
    return unique_results

def main():
    """主函数"""
    data_dir = Path(__file__).parent
    output_dir = data_dir
    
    all_data = []
    
    # 解析所有年份的PDF
    pdf_files = [
        ("af_2021_JUPAS.pdf", 2021),
        ("af_2022_JUPAS_v2.pdf", 2022),
        ("af_2023_JUPAS.pdf", 2023),
        ("af_2024_JUPAS.pdf", 2024),
        ("af_2025_JUPAS.pdf", 2025),
    ]
    
    for pdf_file, year in pdf_files:
        pdf_path = data_dir / pdf_file
        if pdf_path.exists():
            print(f"解析 {pdf_file}...")
            programmes = parse_with_regex(str(pdf_path), year)
            print(f"  找到 {len(programmes)} 个课程")
            all_data.extend(programmes)
        else:
            print(f"文件不存在: {pdf_file}")
    
    # 输出统计
    print(f"\n总计解析 {len(all_data)} 条记录")
    
    # 按大学统计
    by_uni = {}
    for d in all_data:
        uni = d["university"]
        by_uni[uni] = by_uni.get(uni, 0) + 1
    
    print("\n按大学统计:")
    for uni, count in sorted(by_uni.items()):
        print(f"  {uni}: {count}")
    
    # 保存为JSON
    output_file = output_dir / "jupas_scoring_formulas.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    print(f"\n已保存到 {output_file}")
    
    # 生成SQL插入语句
    sql_file = output_dir / "insert_scoring_formulas.sql"
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write("-- JUPAS 计分公式数据\n")
        f.write("-- 自动生成于 parse_jupas_pdf.py\n\n")
        
        for d in all_data:
            # 转义字符串
            def escape(s):
                if s is None:
                    return "NULL"
                return "'" + str(s).replace("'", "''") + "'"
            
            f.write(f"""INSERT OR REPLACE INTO jupas_scoring_formulas 
(programme_code, year, university, scoring_base, include_english, include_math, 
 include_specific, subject_weights, sixth_subject_bonus, 
 highest_attainable, median, lower_quartile, formula_description, notes)
VALUES (
  {escape(d['programme_code'])}, {d['year']}, {escape(d['university'])},
  {escape(d['scoring_base'])}, {1 if d['include_english'] else 0}, {1 if d['include_math'] else 0},
  {escape(json.dumps(d['include_specific']))}, {escape(json.dumps(d['subject_weights']))}, {d['sixth_subject_bonus']},
  {d['highest_attainable'] if d['highest_attainable'] else 'NULL'}, 
  {d['median'] if d['median'] else 'NULL'}, 
  {d['lower_quartile'] if d['lower_quartile'] else 'NULL'},
  {escape(d['formula_description'][:500] if d['formula_description'] else '')}, 
  {escape(d.get('notes', ''))}
);\n\n""")
    
    print(f"SQL已保存到 {sql_file}")
    
    return all_data

if __name__ == "__main__":
    main()
