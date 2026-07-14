#!/usr/bin/env python

# JLCPCB Parts MCP Server
# Created by @nvsofts
# 
# Data is provided from JLC PCB SMD Assembly Component Catalogue
# https://github.com/yaqwsx/jlcparts

import sqlite3
import json
import sys
import os
import urllib.request
import urllib.parse

from fastmcp import FastMCP, Image
from pydantic import BaseModel, Field, ConfigDict

# SQLite database path, please change this!
JLCPCB_DB_PATH = os.getenv('JLCPCB_DB_PATH')

if not JLCPCB_DB_PATH:
  print('Please set JLCPCB_DB_PATH environment value!', file=sys.stderr)
  sys.exit(1)

mcp = FastMCP('jlcpcb-parts')
conn = sqlite3.connect(JLCPCB_DB_PATH)

@mcp.tool()
def list_categories() -> str:
  """JLCPCBの部品のカテゴリ一覧を取得する"""
  result = conn.execute('SELECT id,category,subcategory FROM categories')
  return "|カテゴリID|カテゴリ名|サブカテゴリ名|\n|--|--|--|\n" + "\n".join(f'|{r[0]}|{r[1]}|{r[2]}|' for r in result)

@mcp.tool()
def list_manufacturers() -> str:
  """JLCPCBの部品のメーカー一覧を取得する"""
  result = conn.execute('SELECT id,name FROM manufacturers')
  return "|メーカーID|メーカー名|\n|--|--|\n" + "\n".join(f'|{r[0]}|{r[1]}|' for r in result)

@mcp.tool()
def get_category(category_id: int) -> str | None:
  """カテゴリIDから、カテゴリ名とサブカテゴリ名を取得する"""
  result = conn.execute('SELECT category,subcategory FROM categories WHERE id=?', [category_id]).fetchone()
  if result:
    return f'カテゴリ名：{result[0]}、サブカテゴリ名：{result[1]}'
  else:
    return None

@mcp.tool()
def get_manufacturer(manufacturer_id: int) -> str | None:
  """メーカーIDから、メーカー名を取得する"""
  result = conn.execute('SELECT name FROM manufacturers WHERE id=?', [manufacturer_id]).fetchone()
  if result:
    return result[0]
  else:
    return None

@mcp.tool()
def search_manufacturer(name: str) -> str | None:
  """メーカー名から部分一致で検索を行い、メーカーIDを取得する"""
  result = conn.execute('SELECT id,name FROM manufacturers WHERE name LIKE ?', [f'%{name}%'])
  lines = []
  for r in result:
    lines.append(f'|{r[0]}|{r[1]}|')
  if lines:
    return "|メーカーID|メーカー名|\n" + "\n".join(lines)
  else:
    return None

'''
@mcp.tool()
def search_subcategories(name: str) -> str | None:
  """サブカテゴリ名（英語表記）から検索を行い、カテゴリIDを取得する"""
  result = conn.execute('SELECT id,subcategory FROM categories WHERE subcategory LIKE ?', [f'%{name}%'])
  lines = []
  for r in result:
    lines.append(f'|{r[0]}|{r[1]}|')
  if lines:
    return "|カテゴリID|サブカテゴリ名|\n" + "\n".join(lines)
  else:
    return None
'''

@mcp.tool()
def get_datasheet_url(part_id: int) -> str | None:
  """JLCPCBの部品番号から、データシートのURLを取得する、数字の部分のみだけで良い"""
  result = conn.execute('SELECT datasheet FROM components WHERE lcsc=?', [part_id]).fetchone()
  if result:
    return result[0]
  else:
    return None

@mcp.tool()
def get_part_image(part_id: int) -> Image | None:
  """JLCPCBの部品番号から、部品の写真を取得する、数字の部分のみだけで良い"""
  try:
    result = conn.execute('SELECT extra FROM components WHERE lcsc=?', [part_id]).fetchone()
    if result:
      # 中くらいの画質の1枚目の写真を提示する
      images = json.loads(result[0])['images'][0]
      url = list(images.values())[int(len(images) / 2)]
      ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].replace('.', '')

      if ext == 'jpg':
        ext = 'jpeg'

      return Image(data=urllib.request.urlopen(url).read(), format=ext)
    else:
      return None
  except Exception as e:
    print(e, file=sys.stderr)
    return None

class SearchQuery(BaseModel):
  category_id: int = Field(ge=1, description='有効なカテゴリID、list_categoriesツールで取得する')
  manufacturer_id: int | None = Field(ge=1, default=None, description='有効なメーカーID、search_manufacturerやlist_manufacturersツールで取得する')
  manufacturer_pn: str = Field(default=None, description='メーカー型番、SQLiteのLIKE演算子におけるパターンで指定')
  description: str = Field(default=None, description='型番以外の説明文、SQLiteのLIKE演算子におけるパターンで指定、OR検索や表記ゆれ（-の有無等）は個別検索の必要あり')
  package: str = Field(default=None)
  is_basic_parts: bool | None = Field(default=None)
  is_preferred_parts: bool | None = Field(default=None)

  model_config = ConfigDict(
    title='検索クエリ',
    description='検索クエリを表現するモデル、各フィールドのAND検索'
  )

@mcp.tool()
def search_parts(search_query: SearchQuery) -> str:
  """JLCPCBの部品を検索する"""
  query = 'SELECT lcsc,category_id,manufacturer_id,mfr,basic,preferred,description,package,stock,price,extra FROM components WHERE '
  where_clauses = []
  params = []

  where_clauses.append('category_id=?')
  params.append(search_query.category_id)

  if search_query.manufacturer_id is not None:
    where_clauses.append('manufacturer_id=?')
    params.append(search_query.manufacturer_id)
  if search_query.manufacturer_pn:
    where_clauses.append('mfr LIKE ?')
    params.append(search_query.manufacturer_pn)
  if search_query.description:
    where_clauses.append('description LIKE ?')
    params.append(search_query.description)
  if search_query.package:
    where_clauses.append('package=?')
    params.append(search_query.package)

  if search_query.is_basic_parts is not None:
    where_clauses.append('basic=' + ('1' if search_query.is_basic_parts is True else '0'))
  if search_query.is_preferred_parts is not None:
    where_clauses.append('preferred=' + ('1' if search_query.is_preferred_parts is True else '0'))

  query += ' AND '.join(where_clauses)

  lines = []
  result = conn.execute(query, params)
  for r in result:
    # 価格情報を文字列に起こす
    price = []
    price_data = ''

    try:
      prices = json.loads(r[9])
      for p in prices:
        if p['qFrom'] is None:
          p['qFrom'] = ''
        if p['qTo'] is None:
          p['qTo'] = ''

        price.append(f"{p['qFrom']}～{p['qTo']} {p['price']}USD/個")

      price_data = '、'.join(price)
    except Exception as e:
      print(e, file=sys.stderr)
      price_data = '情報なし'

    # 特性情報を文字列に起こす
    chars = []
    char_data = ''
    try:
      extra = json.loads(r[10])
      for k, v in extra['attributes'].items():
        chars.append(f"{k}:{v}")

      char_data = '、'.join(chars)
    except Exception as e:
      print(e, file=sys.stderr)
      char_data = '情報なし'

    lines.append(f'|{r[0]}|{r[1]}|{r[2]}|{r[3]}|{r[4]}|{r[5]}|{r[6]}|{r[7]}|{r[8]}|{price_data}|{char_data}|')

  return "|部品番号|カテゴリID|メーカーID|メーカー品番|Basic Partsか|Preferred Partsか|説明|パッケージ|在庫数|価格|特性|\n|--|--|--|--|--|--|--|--|--|--|--|\n" + "\n".join(lines)

if __name__ == '__main__':
  mcp.run(transport='stdio')
