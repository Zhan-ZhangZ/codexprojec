#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import sqlite3
import urllib.request
import urllib.parse
import json
import argparse
import re

def search_zotero_web(user_id, api_key, query=None, limit=10):
    """
    Search Zotero items using the Web API
    """
    print(f"[*] 正在通过 Zotero Web API 检索 (用户 ID: {user_id})...", file=sys.stderr)
    
    url = f"https://api.zotero.org/users/{user_id}/items?limit={limit}"
    if query:
        url += f"&q={urllib.parse.quote(query)}"
        
    req = urllib.request.Request(
        url,
        headers={
            'Zotero-API-Key': api_key,
            'Zotero-API-Version': '3',
            'User-Agent': 'Mozilla/5.0 ZoteroConnector/1.0'
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            items = json.loads(response.read().decode('utf-8'))
            
        results = []
        for item in items:
            data = item.get('data', {})
            if data.get('itemType') == 'attachment':
                continue # Skip attachments
                
            title = data.get('title', '无标题')
            
            # Form authors string
            creators = data.get('creators', [])
            authors = []
            for creator in creators:
                name = ""
                if 'firstName' in creator and 'lastName' in creator:
                    name = f"{creator['lastName']} {creator['firstName']}"
                elif 'name' in creator:
                    name = creator['name']
                if name:
                    authors.append(name)
            author_str = ", ".join(authors) if authors else "未知作者"
            
            results.append({
                'key': item.get('key'),
                'title': title,
                'authors': author_str,
                'date': data.get('date', '未知年份'),
                'itemType': data.get('itemType', '未知类型'),
                'abstract': data.get('abstractNote', ''),
                'url': f"https://www.zotero.org/users/{user_id}/items/{item.get('key')}"
            })
        return results
    except Exception as e:
        print(f"[!] Zotero Web API 请求失败: {e}", file=sys.stderr)
        return []

def get_local_db_path():
    """
    Auto-detect Zotero SQLite database path on macOS
    """
    home = os.path.expanduser("~")
    possible_paths = [
        os.path.join(home, "Zotero", "zotero.sqlite"),
        os.path.join(home, "Library", "Application Support", "Zotero", "Profiles", "*", "zotero.sqlite"),
    ]
    
    for path in possible_paths:
        if "*" in path:
            import glob
            matches = glob.glob(path)
            if matches:
                return matches[0]
        elif os.path.exists(path):
            return path
            
    return None

def search_zotero_local(db_path, query=None, limit=10):
    """
    Search Zotero items using the local SQLite database
    """
    print(f"[*] 正在从本地 Zotero 数据库检索: {db_path}...", file=sys.stderr)
    
    if not os.path.exists(db_path):
        print(f"[!] 错误: 本地数据库文件不存在: {db_path}", file=sys.stderr)
        return []
        
    results = []
    conn = None
    try:
        # Connect in read-only mode to prevent database locking/corruption
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.cursor()
        
        # SQL to retrieve item meta: itemID, key, itemType, fieldName, fieldValue
        # Zotero schema:
        # - items: itemID, key, itemTypeID
        # - itemTypes: itemTypeID, typeName
        # - itemData: itemID, fieldID, valueID
        # - fields: fieldID, fieldName
        # - itemDataValues: valueID, value
        
        # Let's first build a dictionary of items and their fields
        sql = """
        SELECT items.itemID, items.key, itemTypes.typeName, fields.fieldName, itemDataValues.value
        FROM items
        JOIN itemTypes ON items.itemTypeID = itemTypes.itemTypeID
        JOIN itemData ON items.itemID = itemData.itemID
        JOIN fields ON itemData.fieldID = fields.fieldID
        JOIN itemDataValues ON itemData.valueID = itemDataValues.valueID
        WHERE itemTypes.typeName != 'attachment' AND itemTypes.typeName != 'note'
        """
        
        cursor.execute(sql)
        raw_data = cursor.fetchall()
        
        item_dict = {}
        for item_id, key, type_name, field_name, value in raw_data:
            if item_id not in item_dict:
                item_dict[item_id] = {
                    'key': key,
                    'itemType': type_name,
                    'title': '',
                    'date': '',
                    'abstract': '',
                    'url': '',
                    'authors': []
                }
            
            # Map common fields
            if field_name == 'title':
                item_dict[item_id]['title'] = value
            elif field_name == 'date':
                # Just extract year
                year_match = re.search(r'\b(19|20)\d{2}\b', value)
                item_dict[item_id]['date'] = year_match.group(0) if year_match else value
            elif field_name == 'abstractNote':
                item_dict[item_id]['abstract'] = value
            elif field_name == 'url':
                item_dict[item_id]['url'] = value

        # Retrieve creators/authors
        creator_sql = """
        SELECT itemCreators.itemID, creators.lastName, creators.firstName
        FROM itemCreators
        JOIN creators ON itemCreators.creatorID = creators.creatorID
        ORDER BY itemCreators.orderIndex
        """
        cursor.execute(creator_sql)
        creator_data = cursor.fetchall()
        
        for item_id, last_name, first_name in creator_data:
            if item_id in item_dict:
                name = f"{last_name or ''} {first_name or ''}".strip()
                if name:
                    item_dict[item_id]['authors'].append(name)
                    
        # Filter and query search
        filtered_items = []
        for item_id, info in item_dict.items():
            author_str = ", ".join(info['authors']) if info['authors'] else "未知作者"
            info['authors'] = author_str
            
            # If query is specified, search in title, authors, or abstract
            if query:
                q = query.lower()
                title_match = q in info['title'].lower()
                author_match = q in author_str.lower()
                abstract_match = q in info['abstract'].lower()
                
                if not (title_match or author_match or abstract_match):
                    continue
                    
            filtered_items.append(info)
            
        # Sort and limit
        # Sort by title
        filtered_items.sort(key=lambda x: x['title'])
        results = filtered_items[:limit]
        
    except Exception as e:
        print(f"[!] 本地 SQLite 检索失败: {e}", file=sys.stderr)
    finally:
        if conn:
            conn.close()
            
    return results

def main():
    parser = argparse.ArgumentParser(description="Zotero 文献库查询工具 (支持本地 SQLite 与 Web API)")
    parser.add_argument("query", type=str, nargs="?", help="文献搜索关键词")
    parser.add_argument("--query", "-q", type=str, dest="query_opt", help="文献搜索关键词 (替代位置参数)")
    parser.add_argument("--db-path", "-d", type=str, help="本地 Zotero 数据库 zotero.sqlite 的绝对路径")
    parser.add_argument("--user-id", "-u", type=str, help="Zotero Web API 用户 ID")
    parser.add_argument("--api-key", "-k", type=str, help="Zotero Web API 密钥")
    parser.add_argument("--limit", "-l", type=int, default=10, help="最多返回记录条数")
    
    args = parser.parse_args()
    
    query = args.query or args.query_opt
    
    # Check remote API credentials in env or args
    api_key = args.api_key or os.environ.get("ZOTERO_API_KEY")
    user_id = args.user_id or os.environ.get("ZOTERO_USER_ID")
    
    results = []
    
    if api_key and user_id:
        # Remote mode
        results = search_zotero_web(user_id, api_key, query, args.limit)
    else:
        # Local mode
        db_path = args.db_path or get_local_db_path()
        if not db_path:
            print("[!] 未指定数据库路径，且未能在默认位置检测到本地 Zotero 数据库。", file=sys.stderr)
            print("[!] 建议配置本地路径: --db-path /path/to/zotero.sqlite", file=sys.stderr)
            print("[!] 或配置 Zotero Web API 环境变量: ZOTERO_API_KEY & ZOTERO_USER_ID", file=sys.stderr)
            sys.exit(1)
        results = search_zotero_local(db_path, query, args.limit)
        
    # Format and Output Results as Markdown
    if not results:
        print("未在 Zotero 文献库中找到匹配记录。")
        return
        
    print(f"# Zotero 文献库检索结果 (共 {len(results)} 条)\n")
    for idx, item in enumerate(results, 1):
        print(f"### {idx}. {item['title']}")
        print(f"- **条目类型**: {item['itemType']}")
        print(f"- **作者**: {item['authors']}")
        print(f"- **年份/日期**: {item['date']}")
        if item['url']:
            print(f"- **URL**: [{item['url']}]({item['url']})")
        if item['abstract']:
            # Shorten abstract
            abstract = item['abstract']
            if len(abstract) > 300:
                abstract = abstract[:297] + "..."
            print(f"- **摘要**: {abstract}")
        print()

if __name__ == "__main__":
    main()
