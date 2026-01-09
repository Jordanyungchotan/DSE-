#!/usr/bin/env python3
"""
正确爬取 chsc.hk 中学数据
关键：使用第4列"分區"字段来确定学校真正所属的区
"""
import requests
from bs4 import BeautifulSoup
import json
import time

# 只需要爬取一个区，收集所有学校，然后按分区归类
def scrape_all_schools():
    """从一个区的页面爬取所有学校（因为会显示本区+他区的所有学校）"""
    
    # 使用 district_id=1 来获取完整列表
    url = "https://www.chsc.hk/ssp2025/sch_list.php?lang_id=2&frmMode=pagebreak&district_id=1&sch_type=&sch_name="
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    all_schools = {}  # 按分区归类
    seen = set()  # 去重
    
    # 爬取多个区的页面以确保收集到所有学校
    for district_id in range(1, 19):
        url = f"https://www.chsc.hk/ssp2025/sch_list.php?lang_id=2&frmMode=pagebreak&district_id={district_id}&sch_type=&sch_name="
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            response.encoding = 'utf-8'
            soup = BeautifulSoup(response.text, 'html.parser')
            
            table = soup.find('table')
            if not table:
                continue
                
            rows = table.find_all('tr')[1:]  # 跳过表头
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 5:
                    # 第2列：学校名称（英文+中文）
                    name_cell = cells[1]
                    name_text = name_cell.get_text(separator='\n').strip()
                    lines = [l.strip() for l in name_text.split('\n') if l.strip()]
                    
                    if len(lines) >= 2:
                        name_en = lines[0]
                        name_zh = lines[1]
                    elif lines:
                        name_zh = lines[0]
                        name_en = ''
                    else:
                        continue
                    
                    # 第3列：性别
                    gender = cells[2].get_text(strip=True)
                    
                    # 第4列：分区（学校真正所属的区）
                    district = cells[3].get_text(strip=True)
                    
                    # 第5列：资助种类
                    school_type = cells[4].get_text(strip=True)
                    
                    # 第6列：宗教
                    religion = cells[5].get_text(strip=True) if len(cells) > 5 else ''
                    
                    # 去重（使用中文名）
                    if name_zh and name_zh not in seen:
                        seen.add(name_zh)
                        
                        if district not in all_schools:
                            all_schools[district] = []
                        
                        all_schools[district].append({
                            'name': name_zh,
                            'name_en': name_en,
                            'gender': gender,
                            'type': school_type,
                            'religion': religion
                        })
            
            print(f"已爬取 district_id={district_id}，累计 {len(seen)} 所学校")
            time.sleep(0.5)
            
        except Exception as e:
            print(f"district_id={district_id} 错误: {e}")
    
    return all_schools

def main():
    print("开始爬取 chsc.hk 中学数据...\n")
    
    schools_by_district = scrape_all_schools()
    
    # 统计
    print("\n各区学校数量：")
    total = 0
    for district, schools in sorted(schools_by_district.items()):
        print(f"  {district}: {len(schools)} 所")
        total += len(schools)
    
    print(f"\n总计: {total} 所学校")
    
    # 保存
    with open('chsc_schools_v3.json', 'w', encoding='utf-8') as f:
        json.dump({'districts': schools_by_district}, f, ensure_ascii=False, indent=2)
    
    print("\n数据已保存到 chsc_schools_v3.json")

if __name__ == '__main__':
    main()
