#!/usr/bin/env python3
"""
合并 EDB 和 CHSC 学校数据 V2
★ 以 EDB 数据为主（学校列表和分区以EDB为准）
★ CHSC 数据补充宗教、英文名等详细信息
按4大区域、18小区分类
"""

import json
import re
import hashlib

# 4大区域分类
REGION_MAP = {
    "港島區域": {
        "region_code": "HK",
        "region_label": "港島",
        "districts": ["中西區", "東區", "離島區", "南區", "灣仔區"]
    },
    "九龍區域": {
        "region_code": "KLN",
        "region_label": "九龍",
        "districts": ["九龍城區", "觀塘區", "西貢區", "深水埗區", "黃大仙區", "油尖旺區"]
    },
    "新界東區域": {
        "region_code": "NTE",
        "region_label": "新界東",
        "districts": ["北區", "沙田區", "大埔區"]
    },
    "新界西區域": {
        "region_code": "NTW",
        "region_label": "新界西",
        "districts": ["葵青區", "荃灣區", "屯門區", "元朗區"]
    }
}


def normalize_name(name):
    """标准化学校名以便匹配"""
    # 统一括号
    name = name.replace('﹝', '（').replace('﹞', '）')
    name = name.replace(' (', '（').replace('(', '（').replace(')', '）')
    # 移除多余空格
    name = re.sub(r'\s+', '', name)
    return name


def load_edb_data():
    """从最新 EDB V2 数据加载"""
    with open("edb_schools_v2.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("districts", {})


def load_chsc_data():
    """从 CHSC 数据加载，建立名称索引"""
    with open("chsc_schools_final_v2.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # 建立按标准化名称的索引
    chsc_index = {}
    for district, schools in data.get("districts", {}).items():
        for school in schools:
            norm = normalize_name(school["name"])
            chsc_index[norm] = school
    
    return chsc_index


def get_region_for_district(district):
    """获取区所属的大区域"""
    for region_name, info in REGION_MAP.items():
        if district in info["districts"]:
            return region_name, info["region_code"], info["region_label"]
    return None, None, None


def merge_datasets():
    """以EDB为主合并数据"""
    print("加载 EDB 数据 (edb_schools_v2.json)...")
    edb_data = load_edb_data()
    edb_total = sum(len(v) for v in edb_data.values())
    print(f"  EDB: {edb_total} 所学校, {len(edb_data)} 区")
    
    print("\n加载 CHSC 数据 (chsc_schools_final_v2.json)...")
    chsc_index = load_chsc_data()
    print(f"  CHSC: {len(chsc_index)} 所学校")
    
    merged = {}
    matched = 0
    edb_only_list = []
    
    for district, schools in edb_data.items():
        district_schools = []
        
        for school in schools:
            edb_name = school["name"]
            norm_name = normalize_name(edb_name)
            
            # 查找 CHSC 中的对应学校
            chsc_match = chsc_index.get(norm_name)
            
            if chsc_match:
                matched += 1
                # 用 EDB 的分区，CHSC 补充详细信息
                merged_school = {
                    "name": edb_name,
                    "name_en": chsc_match.get("name_en", "") or school.get("name_en", ""),
                    "type": school.get("type", chsc_match.get("type", "")),
                    "gender": school.get("gender", chsc_match.get("gender", "男女")),
                    "religion": chsc_match.get("religion", "不適用"),
                }
            else:
                edb_only_list.append((district, edb_name))
                # 纯 EDB 数据
                merged_school = {
                    "name": edb_name,
                    "name_en": school.get("name_en", ""),
                    "type": school.get("type", ""),
                    "gender": school.get("gender", "男女"),
                    "religion": "不適用",
                }
            
            district_schools.append(merged_school)
        
        # 按中文名排序
        district_schools.sort(key=lambda x: x["name"])
        merged[district] = district_schools
    
    total = sum(len(v) for v in merged.values())
    print(f"\n合并结果:")
    print(f"  总计: {total} 所学校")
    print(f"  匹配CHSC: {matched} 所")
    print(f"  仅EDB: {len(edb_only_list)} 所")
    
    if edb_only_list:
        print(f"\n仅在EDB中的学校:")
        for dist, name in edb_only_list:
            print(f"  [{dist}] {name}")
    
    return merged


def generate_final_data(merged_data):
    """生成最终的分区数据"""
    final = {
        "metadata": {
            "source": "EDB (edb.gov.hk) 主 + CHSC (chsc.hk) 辅",
            "date": "2025-2026",
            "description": "香港18区中学名单（官立、資助、直資）- 以EDB分区为准",
        },
        "regions": {},
        "districts": {},
        "total": 0,
    }
    
    total = 0
    
    for region_name, info in REGION_MAP.items():
        region_data = {
            "code": info["region_code"],
            "label": info["region_label"],
            "districts": {}
        }
        
        for district in info["districts"]:
            schools = merged_data.get(district, [])
            enriched_schools = []
            for school in schools:
                enriched = {
                    "name": school.get("name", ""),
                    "name_en": school.get("name_en", ""),
                    "type": school.get("type", ""),
                    "gender": school.get("gender", "男女"),
                    "religion": school.get("religion", "不適用"),
                    "district": district,
                    "region": info["region_code"],
                    "region_label": info["region_label"],
                }
                enriched_schools.append(enriched)
            
            region_data["districts"][district] = enriched_schools
            final["districts"][district] = enriched_schools
            total += len(enriched_schools)
        
        final["regions"][region_name] = region_data
    
    final["total"] = total
    return final


def generate_typescript(final_data):
    """生成 TypeScript 数据文件"""
    lines = []
    lines.append("// 香港18区中学数据 (来源: edb.gov.hk 學校名單 2025/2026 + chsc.hk 中學概覽)")
    lines.append(f"// 总计: {final_data['total']} 所学校（以EDB分区为准，已去重，按4大区域18小区分类）")
    lines.append("")
    lines.append("export interface SchoolInfo {")
    lines.append("  name: string;")
    lines.append("  name_en: string;")
    lines.append("  type: string;")
    lines.append("  gender: string;")
    lines.append("  religion?: string;")
    lines.append("}")
    lines.append("")
    lines.append("// 4大区域 -> 18小区 映射")
    lines.append("export const REGION_DISTRICTS: Record<string, { code: string; label: string; districts: string[] }> = {")
    
    for region_name, info in REGION_MAP.items():
        lines.append(f"  '{region_name}': {{")
        lines.append(f"    code: '{info['region_code']}',")
        lines.append(f"    label: '{info['region_label']}',")
        districts_str = ", ".join([f"'{d}'" for d in info['districts']])
        lines.append(f"    districts: [{districts_str}],")
        lines.append(f"  }},")
    
    lines.append("};")
    lines.append("")
    lines.append("// 区 -> 区域代码映射")
    lines.append("export const DISTRICT_TO_REGION: Record<string, { code: string; label: string }> = {")
    
    for region_name, info in REGION_MAP.items():
        for district in info['districts']:
            lines.append(f"  '{district}': {{ code: '{info['region_code']}', label: '{info['region_label']}' }},")
    
    lines.append("};")
    lines.append("")
    lines.append("export const SCHOOLS_BY_DISTRICT: Record<string, SchoolInfo[]> = {")
    
    for district_name, schools in final_data["districts"].items():
        lines.append(f"  '{district_name}': [")
        for school in schools:
            name = school["name"].replace("'", "\\'")
            name_en = school["name_en"].replace("'", "\\'")
            school_type = school["type"]
            gender = school["gender"]
            religion = school.get("religion", "不適用")
            
            lines.append(f"    {{ name: '{name}', name_en: '{name_en}', type: '{school_type}', gender: '{gender}', religion: '{religion}' }},")
        
        lines.append(f"  ],")
    
    lines.append("};")
    lines.append("")
    lines.append(f"export const TOTAL_SCHOOLS = {final_data['total']};")
    lines.append("")
    
    return "\n".join(lines)


def generate_sql_inserts(final_data):
    """生成 SQL INSERT 语句用于更新 D1 数据库"""
    lines = []
    lines.append("-- 香港18区中学数据 (2025/2026) - 以EDB分区为准")
    lines.append(f"-- 总计: {final_data['total']} 所学校")
    lines.append("")
    lines.append("-- 清空现有数据")
    lines.append("DELETE FROM transfer_schools;")
    lines.append("")
    lines.append("-- 插入新数据")
    
    for district_name, schools in final_data["districts"].items():
        lines.append(f"\n-- {district_name} ({len(schools)} 所)")
        for school in schools:
            name = school["name"].replace("'", "''")
            name_en = school["name_en"].replace("'", "''")
            school_type = school["type"]
            gender = school["gender"]
            religion = school.get("religion", "不適用").replace("'", "''")
            district = district_name.replace("'", "''")
            region = school["region"]
            region_label = school["region_label"]
            
            # 生成 ID (16-char SHA256 hash)
            id_str = f"{school['name']}:{district_name}"
            school_id = hashlib.sha256(id_str.encode()).hexdigest()[:16]
            
            lines.append(
                f"INSERT OR REPLACE INTO transfer_schools (id, name, name_en, region, region_label, district, school_type, gender, religion, source) "
                f"VALUES ('{school_id}', '{name}', '{name_en}', '{region}', '{region_label}', '{district}', '{school_type}', '{gender}', '{religion}', 'EDB 2025/2026');"
            )
    
    return "\n".join(lines)


def main():
    print("=" * 60)
    print("合并学校数据 V2 - 以EDB为主")
    print("=" * 60)
    
    # 合并数据
    merged = merge_datasets()
    
    # 生成最终数据
    print("\n生成最终分区数据...")
    final = generate_final_data(merged)
    
    # 保存 JSON
    with open("schools_final_2025.json", "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)
    print(f"  JSON 数据已保存到 schools_final_2025.json")
    
    # 生成 TypeScript
    ts_content = generate_typescript(final)
    with open("../backend/src/data/schoolsData.ts", "w", encoding="utf-8") as f:
        f.write(ts_content)
    print(f"  TypeScript 数据已保存到 backend/src/data/schoolsData.ts")
    
    # 生成 SQL
    sql_content = generate_sql_inserts(final)
    with open("update_schools.sql", "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"  SQL 数据已保存到 update_schools.sql")
    
    # 复制 SQL 到 rag-worker 目录
    with open("../rag-worker/scripts/update_schools.sql", "w", encoding="utf-8") as f:
        f.write(sql_content)
    print(f"  SQL 数据已复制到 rag-worker/scripts/update_schools.sql")
    
    # 打印统计
    print(f"\n{'='*60}")
    print(f"最终统计: {final['total']} 所学校（以EDB分区为准）")
    print(f"{'='*60}")
    
    for region_name, info in REGION_MAP.items():
        region_total = sum(len(final["districts"].get(d, [])) for d in info["districts"])
        print(f"\n{region_name} ({info['region_label']}) - {region_total} 所:")
        for district in info["districts"]:
            count = len(final["districts"].get(district, []))
            print(f"  {district}: {count} 所")


if __name__ == "__main__":
    main()
