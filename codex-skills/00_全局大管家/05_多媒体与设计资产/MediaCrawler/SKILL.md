---
name: mediacrawler
description: 全矩阵跨平台社交媒体高匿爬虫引擎 (MediaCrawler)。采用 Playwright 挂载、扫码 / Cookie 会话保持，成功规避小红书、抖音、B站等平台的严厉风控反爬策略，合法合规提取帖子及评论区舆情。Leading Words: 全矩阵社交媒体爬虫, Playwright防反爬绕过, 评论区舆情提取, 小红书抖音帖子抓取
  A social media data crawler tool to scrape notes, videos, articles, posts, and comments
  from platforms like Xiaohongshu (xhs), Douyin (dy), Bilibili (bili), Kuaishou (ks),
  Weibo (wb), Zhihu (zhihu), Baidu Tieba (tieba). Use when the user asks to "scrape social media",
  "crawl Xiaohongshu", "fetch comments from Douyin", "爬取小红书", "抓取B站数据", or mentions "MediaCrawler".
---

# MediaCrawler AI Skill

MediaCrawler is an advanced social media crawler using Playwright to scrape posts, videos, comments, and creator profiles across major Chinese social media platforms.

## Platforms & Identifiers

| Platform | ID (`--platform`) | Capabilities |
|---|---|---|
| **Xiaohongshu (小红书)** | `xhs` | Notes, detailed content, comments, creators |
| **Douyin (抖音)** | `dy` | Videos, comments, creator profiles |
| **Bilibili (B站)** | `bili` | Videos, comments, creator profiles |
| **Kuaishou (快手)** | `ks` | Videos, comments, creator profiles |
| **Weibo (微博)** | `wb` | Posts, comments |
| **Zhihu (知乎)** | `zhihu` | Answers, articles, questions |
| **Baidu Tieba (贴吧)** | `tieba` | Threads, replies |

## Core Commands

Always run commands from the project directory: `codex-skills/46_小红书热门营销文案与自动化控制小红书账号/MediaCrawler/`.

### 1. Setup & Installation
Before running for the first time, ensure dependencies and Playwright are installed:
```bash
pip install -r requirements.txt
playwright install
```

### 2. Search Crawler
Crawl content by search keywords:
```bash
python3 main.py --platform xhs --type search --keywords "AI写作,写作提效" --save_data_option jsonl
```

### 3. Detail Crawler
Crawl detailed information for specified note/video IDs:
```bash
python3 main.py --platform xhs --type detail --specified_id "6612abcde12345,6623bcde23456" --get_comment yes
```

### 4. Creator Profile Crawler
Crawl posts or videos published by specified creators:
```bash
python3 main.py --platform xhs --type creator --creator_id "5f23456abcd,5f34567bcde"
```

## Key Configuration Options

*   `--lt`: Login type (`qrcode` = QR code login, `phone` = Phone verification, `cookie` = Login via raw cookie string).
*   `--cookies`: Cookie string (used when `--lt cookie` is selected).
*   `--get_comment`: Scrape first-level comments (`yes` or `no`, default `yes`).
*   `--get_sub_comment`: Scrape sub-comments/second-level replies (`yes` or `no`, default `no`).
*   `--save_data_option`: Output format (`csv`, `json`, `jsonl`, `sqlite`, `excel`, `db`).
*   `--crawler_max_notes_count`: Limit total number of posts to crawl.
*   `--max_comments_count_singlenotes`: Limit total number of comments to crawl per post.
*   `--headless`: Set browser headless mode (`yes` or `no`).

## Output Storage
By default, the scraped data is saved inside the `data/` subdirectory within the `MediaCrawler` folder. Supported formats include `.jsonl`, `.csv`, and `.xlsx`.
