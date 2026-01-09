#!/usr/bin/env python3
"""
将爬取的学校数据同步到 Cloudflare D1 数据库
"""

import json
import requests

API_BASE = "https://dse-analysis-api.jordanyungchotan.workers.dev"
ADMIN_KEY = "dse-admin-secret-2024"

def main():
    # 读取数据
    with open('chsc_schools_final.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"准备同步 {len(data['districts'])} 个区的学校数据...")
    
    # 发送到API
    response = requests.post(
        f"{API_BASE}/api/admin/schools/import",
        json=data,
        headers={
            'Content-Type': 'application/json',
            'X-Admin-Key': ADMIN_KEY
        },
        timeout=60
    )
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 同步成功: {result}")
    else:
        print(f"❌ 同步失败: {response.status_code} {response.text}")

if __name__ == '__main__':
    main()
