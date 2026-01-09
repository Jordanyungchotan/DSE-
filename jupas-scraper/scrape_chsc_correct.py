#!/usr/bin/env python3
"""
重新爬取 chsc.hk 中学数据，只保留每个学校真正所属的区（分区字段）
"""
import requests
from bs4 import BeautifulSoup
import json
import time
import re

# 18个区的 district_id
DISTRICTS = {
    1: "中西區",
    2: "東區", 
    3: "南區",
    4: "灣仔區",
    5: "九龍城區",
    6: "觀塘區",
    7: "深水埗區",
    8: "黃大仙區",
    9: "油尖旺區",
    10: "葵青區",
    11: "離島區",
    12: "北區",
    13: "西貢區",
    14: "沙田區",
    15: "大埔區",
    16: "荃灣區",
    17: "屯門區",
    18: "元朗區"
}

def scrape_district(district_id, district_name):
    """爬取单个区的学校，只保留分区=本区的学校"""
    url = f"https://www.chsc.hk/ssp2025/sch_list.php?lang_id=2&frmMode=pagebreak&district_id={district_id}&sch_type=&sch_name="
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        schools = []
        
        # 查找所有学校行
        rows = soup.find_all('tr')
        
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 4:
                # 检查第一个单元格是否有"本"图标（本区学校）
                first_cell = cells[0]
                
                # 查找本区标记
                is_local = False
                img = first_cell.find('img')
                if img:
                    src = img.get('src', '')
                    alt = img.get('alt', '')
                    # 本区图标通常包含 'local' 或特定标记
                    if 'local' in src.lower() or '本' in alt:
                        is_local = True
                
                # 也检查分区列（第4列）是否等于当前区
                if len(cells) >= 4:
                    district_cell = cells[3].get_text(strip=True) if len(cells) > 3 else ''
                    if district_cell == district_name:
                        is_local = True
                
                if is_local:
                    # 提取学校信息
                    name_cell = cells[1] if len(cells) > 1 else cells[0]
                    
                    # 获取学校名称
                    lines = name_cell.get_text(separator='\n').strip().split('\n')
                    name_en = lines[0].strip() if lines else ''
                    name_zh = lines[1].strip() if len(lines) > 1 else ''
                    
                    if name_zh:  # 确保有中文名
                        gender = cells[2].get_text(strip=True) if len(cells) > 2 else ''
                        school_type = cells[4].get_text(strip=True) if len(cells) > 4 else ''
                        religion = cells[5].get_text(strip=True) if len(cells) > 5 else ''
                        
                        schools.append({
                            'name': name_zh,
                            'name_en': name_en,
                            'gender': gender,
                            'type': school_type,
                            'religion': religion
                        })
        
        return schools
    except Exception as e:
        print(f"  错误: {e}")
        return []

def main():
    all_schools = {}
    unique_schools = set()  # 用于去重
    
    print("开始爬取 chsc.hk 中学数据（只保留本区学校）...\n")
    
    for district_id, district_name in DISTRICTS.items():
        print(f"爬取 {district_name} (ID: {district_id})...")
        
        schools = scrape_district(district_id, district_name)
        
        # 去重
        filtered_schools = []
        for school in schools:
            key = school['name']
            if key not in unique_schools:
                unique_schools.add(key)
                filtered_schools.append(school)
        
        all_schools[district_name] = filtered_schools
        print(f"  找到 {len(filtered_schools)} 所本区学校")
        
        time.sleep(1)  # 礼貌性延迟
    
    # 统计
    total = sum(len(s) for s in all_schools.values())
    print(f"\n总计: {total} 所学校（已去重）")
    
    # 保存
    with open('chsc_schools_correct.json', 'w', encoding='utf-8') as f:
        json.dump({'districts': all_schools}, f, ensure_ascii=False, indent=2)
    
    print("\n数据已保存到 chsc_schools_correct.json")
    
    return all_schools

if __name__ == '__main__':
    main()
