#!/usr/bin/env python3
"""
爬取 chsc.hk 网站上的香港中学分区数据 - 改进版
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re

# 实际网站的district_id映射
CHSC_DISTRICT_IDS = {
    1: '中西區',
    2: '東區',
    3: '離島區',
    4: '南區',
    5: '灣仔區',
    6: '九龍城區',
    7: '觀塘區',
    8: '西貢區',
    9: '深水埗區',
    10: '黃大仙區',
    11: '油尖旺區',
    12: '北區',
    13: '沙田區',
    14: '大埔區',
    15: '葵青區',
    16: '荃灣區',
    17: '屯門區',
    18: '元朗區',
}

def scrape_district(district_id):
    """爬取单个区的学校列表"""
    url = f"https://www.chsc.hk/ssp2025/sch_list.php?lang_id=2&frmMode=pagebreak&district_id={district_id}&sch_type=&sch_name="
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        schools = []
        
        # 查找表格
        tables = soup.find_all('table')
        
        for table in tables:
            rows = table.find_all('tr')
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 5:
                    # 查找学校链接
                    link = cells[1].find('a') if len(cells) > 1 else None
                    if not link:
                        link = cells[0].find('a')
                    
                    if link and 'sch_detail.php' in link.get('href', ''):
                        full_name = link.get_text(strip=True)
                        
                        # 跳过无效名称
                        if not full_name or len(full_name) < 3:
                            continue
                        
                        # 提取学校ID
                        href = link.get('href', '')
                        sch_id_match = re.search(r'sch_id=(\d+)', href)
                        sch_id = sch_id_match.group(1) if sch_id_match else None
                        
                        # 解析名称 - 通常格式为 "英文名 中文名"
                        name_zh = full_name
                        name_en = ''
                        
                        # 检查是否有中文字符
                        chinese_chars = re.findall(r'[\u4e00-\u9fff]+', full_name)
                        if chinese_chars:
                            # 找到中文部分的起始位置
                            first_chinese = chinese_chars[0]
                            pos = full_name.find(first_chinese)
                            if pos > 0:
                                name_en = full_name[:pos].strip()
                                name_zh = full_name[pos:].strip()
                            else:
                                name_zh = full_name
                        
                        # 获取性别、资助类型等
                        gender = ''
                        district = ''
                        funding_type = ''
                        religion = ''
                        
                        for i, cell in enumerate(cells):
                            text = cell.get_text(strip=True)
                            if text in ['男', '女', '男女']:
                                gender = text
                            elif text in ['官立', '資助', '直資', '按位津貼', '私立']:
                                funding_type = text
                            elif '區' in text:
                                district = text
                        
                        schools.append({
                            'school_id': sch_id,
                            'name_zh': name_zh,
                            'name_en': name_en,
                            'gender': gender,
                            'funding_type': funding_type,
                        })
        
        # 去重
        seen = set()
        unique_schools = []
        for school in schools:
            key = school['name_zh']
            if key not in seen and len(key) > 2:
                seen.add(key)
                unique_schools.append(school)
        
        return unique_schools
        
    except Exception as e:
        print(f"爬取区域 {district_id} 失败: {e}")
        import traceback
        traceback.print_exc()
        return []

def main():
    # 区域-区映射
    region_districts = {
        '香港島': ['中西區', '灣仔區', '東區', '南區'],
        '九龍': ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區'],
        '新界': ['葵青區', '荃灣區', '屯門區', '元朗區', '北區', '大埔區', '沙田區', '西貢區', '離島區'],
    }
    
    all_districts = {}
    total_schools = 0
    
    for chsc_id, district_name in CHSC_DISTRICT_IDS.items():
        print(f"正在爬取 {district_name} (district_id={chsc_id})...")
        
        schools = scrape_district(chsc_id)
        print(f"  找到 {len(schools)} 所学校")
        
        # 显示前3所学校作为示例
        for s in schools[:3]:
            print(f"    - {s['name_zh']} ({s['name_en']}) [{s['funding_type']}]")
        
        # 确定区域
        region = None
        for r, districts in region_districts.items():
            if district_name in districts:
                region = r
                break
        if not region:
            region = '新界'
        
        all_districts[district_name] = {
            'region': region,
            'schools': schools
        }
        
        total_schools += len(schools)
        time.sleep(0.5)
    
    print(f"\n总共爬取 {total_schools} 所学校")
    
    # 生成最终数据结构
    final_data = {
        'regions': [
            {
                'name': '香港島',
                'name_en': 'Hong Kong Island',
                'districts': ['中西區', '灣仔區', '東區', '南區']
            },
            {
                'name': '九龍',
                'name_en': 'Kowloon',
                'districts': ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區']
            },
            {
                'name': '新界',
                'name_en': 'New Territories',
                'districts': ['葵青區', '荃灣區', '屯門區', '元朗區', '北區', '大埔區', '沙田區', '西貢區', '離島區']
            }
        ],
        'districts': {}
    }
    
    for district_name, data in all_districts.items():
        final_data['districts'][district_name] = [
            {
                'name': s['name_zh'],
                'name_en': s['name_en'],
                'type': s['funding_type'],
                'gender': s['gender']
            }
            for s in data['schools']
        ]
    
    with open('chsc_schools_final.json', 'w', encoding='utf-8') as f:
        json.dump(final_data, f, ensure_ascii=False, indent=2)
    
    print("数据已保存到 chsc_schools_final.json")
    
    # 打印统计
    print("\n各区学校数量:")
    for district, schools in final_data['districts'].items():
        print(f"  {district}: {len(schools)} 所")

if __name__ == '__main__':
    main()
