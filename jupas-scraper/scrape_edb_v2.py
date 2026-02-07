#!/usr/bin/env python3
"""
从香港教育局(EDB)网站爬取18区中学名单 - 改进版V2
使用更可靠的解析策略：
1. 按页面分段（每页都标注了学校类别）
2. 提取所有中文学校名（包含中學/書院/學校关键词）
3. 配合上下文提取英文名和性别
"""

import requests
from bs4 import BeautifulSoup
import json
import re
import time

# 18区URL配置
DISTRICTS = {
    "港島區域": {
        "中西區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-cw.html",
        "東區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-hke.html",
        "離島區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-i.html",
        "南區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-sou.html",
        "灣仔區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-wch.html",
    },
    "九龍區域": {
        "九龍城區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-kc.html",
        "觀塘區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-kt.html",
        "西貢區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-sk.html",
        "深水埗區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-ssp.html",
        "黃大仙區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-wts.html",
        "油尖旺區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-ytm.html",
    },
    "新界東區域": {
        "北區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-n.html",
        "沙田區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-st.html",
        "大埔區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-tp.html",
    },
    "新界西區域": {
        "葵青區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-kwt.html",
        "荃灣區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-tw.html",
        "屯門區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-tm.html",
        "元朗區": "https://www.edb.gov.hk/en/student-parents/sch-info/sch-search/schlist-by-district/school-list-yl.html",
    },
}

# 中学类别关键词
SECONDARY_CATEGORIES = {
    "GOVERNMENT SECONDARY SCHOOLS": "官立",
    "AIDED SECONDARY SCHOOLS": "資助",
    "DIRECT SUBSIDY SCHEME SECONDARY SCHOOLS": "直資",
    "CAPUT SECONDARY SCHOOLS": "按位津貼",
}

# 非中学类别（遇到这些就停止提取）
NON_SECONDARY = [
    "PRIMARY SCHOOLS",
    "KINDERGARTENS",
    "SPECIAL SCHOOLS",
    "ENGLISH SCHOOLS FOUNDATION",
    "PRIVATE SECONDARY",
    "PRIVATE PRIMARY",
]


def scrape_district(url, district_name):
    """改进版爬取：基于页面文本逐行分析"""
    print(f"  爬取: {district_name}")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = 'utf-8'
        soup = BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"    错误: {e}")
        return []
    
    # 获取整个页面的纯文本（保留换行）
    full_text = soup.get_text(separator='\n')
    lines = [l.strip() for l in full_text.split('\n') if l.strip()]
    
    schools = []
    seen = set()
    current_type = None
    is_secondary = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 检测学校类别切换
        for cat, type_zh in SECONDARY_CATEGORIES.items():
            if cat in line:
                current_type = type_zh
                is_secondary = True
                break
        
        # 检测非中学区域
        for non_sec in NON_SECONDARY:
            if non_sec in line:
                is_secondary = False
                current_type = None
                break
        
        if not is_secondary or current_type is None:
            i += 1
            continue
        
        # 查找中文学校名
        if re.search(r'[\u4e00-\u9fff]', line):
            is_school_name = False
            
            # 学校名关键词
            school_keywords = ['中學', '書院', '公學', '中小學']
            loose_keywords = ['學校', '學院']
            all_keywords = school_keywords + loose_keywords
            
            has_school_keyword = any(kw in line for kw in all_keywords)
            has_secondary_keyword = any(kw in line for kw in school_keywords)
            # 只有当包含小學/幼稚園且不含中学关键词时才视为小学
            has_primary = ('小學' in line or '幼稚園' in line) and not has_secondary_keyword
            
            # 判断是否为纯地址行（不含学校关键词的地址）
            is_address = False
            if any(line.startswith(x) for x in ['香港', '九龍', '新界']):
                # 以地名开头，但如果同时包含学校关键词则是学校名
                if not has_school_keyword:
                    is_address = True
                # 即使包含关键词，如果明显是地址格式（包含道/路/街+号码）
                elif re.search(r'[道路街巷]\s*[\d０-９]', line):
                    is_address = True
            if '屋邨中學' in line or '中學校舍' in line or '標準中學' in line:
                is_address = True
            
            if not is_address and not has_primary:
                # 检查是否包含中学关键词
                if any(kw in line for kw in school_keywords):
                    is_school_name = True
                elif any(kw in line for kw in loose_keywords):
                    # 「學校/學院」要更谨慎
                    if not any(x in line for x in ['地段', '地址', '管理', '校監', '校長', '電話', '傳真', '網址', '委員會']):
                        is_school_name = True
            
            if is_school_name:
                zh_name = line.strip()
                
                # 如果名称太长（超过50字），可能包含了地址等杂信息
                if len(zh_name) > 50:
                    i += 1
                    continue
                
                # 跳过明显不是学校名的
                # 精确匹配段落标题（不是子串匹配，避免过滤掉含"官立中學"的学校名）
                section_headers = ['資助中學', '官立中學', '直接資助計劃中學', '按位津貼中學',
                                   '學校名稱及地址', '學校名稱']
                if zh_name in section_headers:
                    i += 1
                    continue
                
                if any(x in zh_name for x in ['School No', 'Location', 'Date:', 'Page:', 'Tel.', 'Fax',
                                                '學校管理', '校監', '校長', '男女校',
                                                '屋邨中學', '中學校舍', '標準中學', '振華道中學']):
                    i += 1
                    continue
                
                # 跳过地址类行（包含區/邨/道/街/路 + 号码）
                if re.search(r'(第\d|號|樓|座|邨|村|圍|段)', zh_name) and ('中學' not in zh_name[:10] and '書院' not in zh_name[:10]):
                    i += 1
                    continue
                
                if zh_name in seen:
                    i += 1
                    continue
                
                # 找英文名: 往上搜索最近的全大写行
                en_name = ""
                for j in range(max(0, i-5), i):
                    prev = lines[j].strip()
                    if (prev.isupper() and 
                        len(prev) > 5 and 
                        any(kw in prev for kw in ['SCHOOL', 'COLLEGE', 'ACADEMY', 'INSTITUTE', 'CENTRE']) and
                        'SCHOOL NO' not in prev and 'LOCATION' not in prev and
                        'PRIMARY' not in prev and 'KINDERGARTEN' not in prev):
                        en_name = prev
                        break
                
                # 找性别: 往下搜索
                gender = "男女"
                for j in range(i, min(len(lines), i+15)):
                    next_line = lines[j]
                    if 'BOYS 男' in next_line or next_line.strip() == 'BOYS':
                        gender = "男"
                        break
                    elif 'GIRLS 女' in next_line or next_line.strip() == 'GIRLS':
                        gender = "女"
                        break
                    elif 'CO-ED 男女' in next_line or next_line.strip() == 'CO-ED':
                        gender = "男女"
                        break
                    # 遇到下一个学校名就停止搜索
                    if j > i and ('中學' in next_line or '書院' in next_line) and '小學' not in next_line:
                        if re.search(r'^[\u4e00-\u9fff]', next_line):
                            break
                
                # 格式化英文名
                if en_name:
                    en_name = format_english_name(en_name)
                
                # 标准化括号: ﹝﹞ → （）, ( ) → （）
                zh_name = zh_name.replace('﹝', '（').replace('﹞', '）')
                # 半角括号转全角（在中文名中统一用全角）
                zh_name = zh_name.replace(' (', '（').replace('(', '（').replace(')', '）')
                
                if zh_name in seen:
                    i += 1
                    continue
                
                seen.add(zh_name)
                schools.append({
                    "name": zh_name,
                    "name_en": en_name,
                    "type": current_type,
                    "gender": gender,
                })
        
        i += 1
    
    print(f"    找到 {len(schools)} 所中学")
    return schools


def format_english_name(name):
    """格式化英文学校名"""
    name = name.title()
    # 修正常见缩写
    replacements = {
        "'S": "'s",
        " Of ": " of ",
        " And ": " and ",
        " The ": " the ",
        " For ": " for ",
        " In ": " in ",
        " At ": " at ",
        "Skh ": "SKH ",
        "Ccc ": "CCC ",
        "Cnec ": "CNEC ",
        "Plk ": "PLK ",
        "Twghs ": "TWGHs ",
        "Twgh ": "TWGHs ",
        "Hkfew ": "HKFEW ",
        "Ymca ": "YMCA ",
        "Hkuga ": "HKUGA ",
        "Ych ": "YCH ",
        "Poc ": "POC ",
        "Hk ": "HK ",
        "Cma ": "CMA ",
        "Cts ": "CTS ",
        "Skhss ": "SKHSS ",
        "Hkcwc ": "HKCWC ",
        " Sec ": " Sec ",
        " Sch ": " Sch ",
        " Col ": " Col ",
        " Mem ": " Mem ",
        " Fdpohl ": " FDPOHL ",
        "(Hk)": "(HK)",
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    return name


def main():
    all_data = {}
    total_count = 0
    
    print("=" * 60)
    print("EDB中学爬虫 V2 - 基于文本逐行分析")
    print("=" * 60)
    
    for region, districts in DISTRICTS.items():
        print(f"\n区域: {region}")
        for district_name, url in districts.items():
            schools = scrape_district(url, district_name)
            all_data[district_name] = schools
            total_count += len(schools)
            time.sleep(1)
    
    print(f"\n{'='*60}")
    print(f"爬取完成! 总计: {total_count} 所中学")
    print(f"{'='*60}")
    
    # 统计
    for region, districts in DISTRICTS.items():
        print(f"\n{region}:")
        for d in districts:
            print(f"  {d}: {len(all_data.get(d, []))} 所")
    
    # 保存
    output = {
        "regions": {r: list(d.keys()) for r, d in DISTRICTS.items()},
        "districts": all_data,
        "total": total_count,
    }
    
    with open("edb_schools_v2.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"\n数据已保存到 edb_schools_v2.json")
    
    # 与CHSC数据对比
    try:
        with open("chsc_schools_final_v2.json") as f:
            chsc = json.load(f)
        
        chsc_map = {}
        for dist, schools in chsc.get("districts", {}).items():
            for s in schools:
                chsc_map[s["name"]] = dist
        
        edb_map = {}
        for dist, schools in all_data.items():
            for s in schools:
                edb_map[s["name"]] = dist
        
        print(f"\n对比: EDB={len(edb_map)}所, CHSC={len(chsc_map)}所")
        
        chsc_only = [n for n in chsc_map if n not in edb_map]
        edb_only = [n for n in edb_map if n not in chsc_map]
        
        if chsc_only:
            print(f"\nCHSC有但EDB没有: {len(chsc_only)}所")
            for n in sorted(chsc_only):
                print(f"  [{chsc_map[n]}] {n}")
        
        if edb_only:
            print(f"\nEDB有但CHSC没有: {len(edb_only)}所")
            for n in sorted(edb_only):
                print(f"  [{edb_map[n]}] {n}")
    except:
        pass


if __name__ == "__main__":
    main()
