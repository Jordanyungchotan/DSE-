#!/usr/bin/env python3
"""
爬取 chsc.hk 网站上的香港中学分区数据
"""

import requests
from bs4 import BeautifulSoup
import json
import time

# 18区的ID映射
DISTRICT_IDS = {
    1: {'id': 1, 'name_zh': '中西區', 'name_en': 'Central & Western', 'region': '香港島'},
    2: {'id': 2, 'name_zh': '灣仔區', 'name_en': 'Wan Chai', 'region': '香港島'},
    3: {'id': 3, 'name_zh': '東區', 'name_en': 'Eastern', 'region': '香港島'},
    4: {'id': 4, 'name_zh': '南區', 'name_en': 'Southern', 'region': '香港島'},
    5: {'id': 5, 'name_zh': '油尖旺區', 'name_en': 'Yau Tsim Mong', 'region': '九龍'},
    6: {'id': 6, 'name_zh': '深水埗區', 'name_en': 'Sham Shui Po', 'region': '九龍'},
    7: {'id': 7, 'name_zh': '九龍城區', 'name_en': 'Kowloon City', 'region': '九龍'},
    8: {'id': 8, 'name_zh': '黃大仙區', 'name_en': 'Wong Tai Sin', 'region': '九龍'},
    9: {'id': 9, 'name_zh': '觀塘區', 'name_en': 'Kwun Tong', 'region': '九龍'},
    10: {'id': 10, 'name_zh': '葵青區', 'name_en': 'Kwai Tsing', 'region': '新界'},
    11: {'id': 11, 'name_zh': '荃灣區', 'name_en': 'Tsuen Wan', 'region': '新界'},
    12: {'id': 12, 'name_zh': '屯門區', 'name_en': 'Tuen Mun', 'region': '新界'},
    13: {'id': 13, 'name_zh': '元朗區', 'name_en': 'Yuen Long', 'region': '新界'},
    14: {'id': 14, 'name_zh': '北區', 'name_en': 'North', 'region': '新界'},
    15: {'id': 15, 'name_zh': '大埔區', 'name_en': 'Tai Po', 'region': '新界'},
    16: {'id': 16, 'name_zh': '沙田區', 'name_en': 'Sha Tin', 'region': '新界'},
    17: {'id': 17, 'name_zh': '西貢區', 'name_en': 'Sai Kung', 'region': '新界'},
    18: {'id': 18, 'name_zh': '離島區', 'name_en': 'Islands', 'region': '新界'},
}

# 实际网站的district_id映射（根据网站URL）
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
        
        schools = []
        
        # 查找所有学校链接
        for link in soup.find_all('a', href=True):
            href = link.get('href', '')
            if 'sch_detail.php' in href and 'sch_id=' in href:
                school_name = link.get_text(strip=True)
                if school_name and len(school_name) > 1:
                    # 提取学校ID
                    import re
                    sch_id_match = re.search(r'sch_id=(\d+)', href)
                    sch_id = sch_id_match.group(1) if sch_id_match else None
                    
                    # 获取其他信息
                    parent_tr = link.find_parent('tr')
                    gender = ''
                    funding_type = ''
                    religion = ''
                    
                    if parent_tr:
                        tds = parent_tr.find_all('td')
                        if len(tds) >= 5:
                            gender = tds[2].get_text(strip=True) if len(tds) > 2 else ''
                            funding_type = tds[4].get_text(strip=True) if len(tds) > 4 else ''
                            religion = tds[5].get_text(strip=True) if len(tds) > 5 else ''
                    
                    # 分离中英文名称
                    name_zh = school_name
                    name_en = ''
                    if ' ' in school_name:
                        parts = school_name.split(' ')
                        # 检查是否有英文名在前面
                        english_part = []
                        chinese_part = []
                        for part in parts:
                            if any('\u4e00' <= char <= '\u9fff' for char in part):
                                chinese_part.append(part)
                            else:
                                english_part.append(part)
                        if english_part:
                            name_en = ' '.join(english_part)
                        if chinese_part:
                            name_zh = ''.join(chinese_part)
                    
                    schools.append({
                        'school_id': sch_id,
                        'name_zh': name_zh,
                        'name_en': name_en,
                        'gender': gender,
                        'funding_type': funding_type,
                        'religion': religion,
                    })
        
        # 去重
        seen = set()
        unique_schools = []
        for school in schools:
            key = school['name_zh']
            if key not in seen:
                seen.add(key)
                unique_schools.append(school)
        
        return unique_schools
        
    except Exception as e:
        print(f"爬取区域 {district_id} 失败: {e}")
        return []

def main():
    all_data = {
        'regions': {
            '香港島': {
                'name_zh': '香港島',
                'name_en': 'Hong Kong Island',
                'districts': []
            },
            '九龍': {
                'name_zh': '九龍',
                'name_en': 'Kowloon',
                'districts': []
            },
            '新界': {
                'name_zh': '新界',
                'name_en': 'New Territories',
                'districts': []
            }
        },
        'districts': {},
        'schools': []
    }
    
    # 区域-区映射
    region_districts = {
        '香港島': ['中西區', '灣仔區', '東區', '南區'],
        '九龍': ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區'],
        '新界': ['葵青區', '荃灣區', '屯門區', '元朗區', '北區', '大埔區', '沙田區', '西貢區', '離島區'],
    }
    
    total_schools = 0
    
    for chsc_id, district_name in CHSC_DISTRICT_IDS.items():
        print(f"正在爬取 {district_name} (district_id={chsc_id})...")
        
        schools = scrape_district(chsc_id)
        print(f"  找到 {len(schools)} 所学校")
        
        # 确定区域
        region = None
        for r, districts in region_districts.items():
            if district_name in districts:
                region = r
                break
        
        if not region:
            region = '新界'
        
        # 添加到数据结构
        if district_name not in all_data['districts']:
            all_data['districts'][district_name] = {
                'name_zh': district_name,
                'region': region,
                'schools': []
            }
        
        for school in schools:
            school['district'] = district_name
            school['region'] = region
            all_data['districts'][district_name]['schools'].append(school)
            all_data['schools'].append(school)
        
        total_schools += len(schools)
        
        # 添加到区域
        if district_name not in [d['name_zh'] for d in all_data['regions'][region]['districts']]:
            all_data['regions'][region]['districts'].append({
                'name_zh': district_name,
                'school_count': len(schools)
            })
        
        time.sleep(1)  # 礼貌性延迟
    
    print(f"\n总共爬取 {total_schools} 所学校")
    
    # 保存数据
    with open('chsc_schools.json', 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)
    
    print("数据已保存到 chsc_schools.json")
    
    # 生成简化版本用于前端
    simplified = {
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
    
    for district_name, district_data in all_data['districts'].items():
        simplified['districts'][district_name] = [
            {'name': s['name_zh'], 'name_en': s['name_en'], 'type': s['funding_type'], 'gender': s['gender']}
            for s in district_data['schools']
        ]
    
    with open('chsc_schools_simplified.json', 'w', encoding='utf-8') as f:
        json.dump(simplified, f, ensure_ascii=False, indent=2)
    
    print("简化数据已保存到 chsc_schools_simplified.json")

if __name__ == '__main__':
    main()
