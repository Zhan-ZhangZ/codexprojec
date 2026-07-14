#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import json
import argparse
import re

# XML Namespace dictionary for arXiv API parsing
ARXIV_NAMESPACES = {
    'atom': 'http://www.w3.org/2005/Atom',
    'opensearch': 'http://a9.com/-/spec/opensearch/1.1/',
    'arxiv': 'http://arxiv.org/schemas/atom'
}

def clean_text(text):
    if not text:
        return ""
    # Remove excessive whitespaces and newlines
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def search_arxiv(query, limit=5):
    """
    Search arXiv using the Atom API
    """
    print(f"[*] 正在从 arXiv 检索关键词: '{query}'...", file=sys.stderr)
    encoded_query = urllib.parse.quote(f"all:{query}")
    url = f"http://export.arxiv.org/api/query?search_query={encoded_query}&start=0&max_results={limit}"
    
    results = []
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ScientificPaperSearch/1.0'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        
        for entry in root.findall('atom:entry', ARXIV_NAMESPACES):
            # Title
            title_node = entry.find('atom:title', ARXIV_NAMESPACES)
            title = clean_text(title_node.text) if title_node is not None else "Unknown Title"
            
            # Summary / Abstract
            summary_node = entry.find('atom:summary', ARXIV_NAMESPACES)
            abstract = clean_text(summary_node.text) if summary_node is not None else ""
            
            # Authors
            authors = []
            for author in entry.findall('atom:author', ARXIV_NAMESPACES):
                name_node = author.find('atom:name', ARXIV_NAMESPACES)
                if name_node is not None:
                    authors.append(name_node.text.strip())
            author_str = ", ".join(authors) if authors else "Unknown"
            
            # Published Date (Year)
            published_node = entry.find('atom:published', ARXIV_NAMESPACES)
            year = "Unknown"
            if published_node is not None and len(published_node.text) >= 4:
                year = published_node.text[:4]
                
            # URL
            id_node = entry.find('atom:id', ARXIV_NAMESPACES)
            link = id_node.text.strip() if id_node is not None else ""
            
            results.append({
                'title': title,
                'authors': author_str,
                'source': 'arXiv',
                'year': year,
                'abstract': abstract,
                'url': link
            })
    except Exception as e:
        print(f"[!] arXiv 检索失败: {e}", file=sys.stderr)
        
    return results

def search_pubmed(query, limit=5):
    """
    Search PubMed using E-utilities API
    """
    print(f"[*] 正在从 PubMed 检索关键词: '{query}'...", file=sys.stderr)
    results = []
    try:
        # Step 1: Search for IDs
        encoded_query = urllib.parse.quote(query)
        search_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term={encoded_query}&retmax={limit}&retmode=json"
        
        req = urllib.request.Request(
            search_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ScientificPaperSearch/1.0'}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            search_data = json.loads(response.read().decode('utf-8'))
            
        id_list = search_data.get('esearchresult', {}).get('idlist', [])
        if not id_list:
            return results
            
        # Step 2: Fetch summaries for the IDs
        ids_str = ",".join(id_list)
        summary_url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id={ids_str}&retmode=json"
        
        summary_req = urllib.request.Request(
            summary_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ScientificPaperSearch/1.0'}
        )
        with urllib.request.urlopen(summary_req, timeout=15) as response:
            summary_data = json.loads(response.read().decode('utf-8'))
            
        result_dict = summary_data.get('result', {})
        for uid in id_list:
            doc = result_dict.get(uid, {})
            if not doc or 'title' not in doc:
                continue
                
            title = clean_text(doc.get('title'))
            # PubMed summaries sometimes end with punctuation or HTML tags, clean if necessary
            title = re.sub(r'\[PubMed - indexed for MEDLINE\]$', '', title).strip()
            
            # Authors
            authors = []
            for author in doc.get('authors', []):
                if 'name' in author:
                    authors.append(author['name'])
            author_str = ", ".join(authors) if authors else "Unknown"
            
            # Year
            pubdate = doc.get('pubdate', '')
            year_match = re.search(r'\b(19|20)\d{2}\b', pubdate)
            year = year_match.group(0) if year_match else "Unknown"
            
            # Source (Journal name)
            source = doc.get('source', 'PubMed')
            
            # URL
            link = f"https://pubmed.ncbi.nlm.nih.gov/{uid}/"
            
            results.append({
                'title': title,
                'authors': author_str,
                'source': f"PubMed ({source})",
                'year': year,
                'abstract': "摘要需访问PubMed链接查看" if 'abstract' not in doc else clean_text(doc['abstract']),
                'url': link
            })
    except Exception as e:
        print(f"[!] PubMed 检索失败: {e}", file=sys.stderr)
        
    return results

def deduplicate_papers(papers):
    seen = set()
    deduped = []
    for paper in papers:
        # Standardize title for comparison
        clean_title = re.sub(r'[^a-zA-Z0-9]', '', paper['title'].lower())
        if clean_title not in seen:
            seen.add(clean_title)
            deduped.append(paper)
    return deduped

def format_markdown(papers):
    if not papers:
        return "未找到相关文献。"
        
    md = []
    md.append(f"# 文献学术检索结果 (共 {len(papers)} 篇)\n")
    
    for idx, paper in enumerate(papers, 1):
        md.append(f"### {idx}. {paper['title']}")
        md.append(f"- **作者**: {paper['authors']}")
        md.append(f"- **来源**: {paper['source']} ({paper['year']})")
        md.append(f"- **链接**: [{paper['url']}]({paper['url']})")
        if paper['abstract']:
            md.append(f"- **摘要**: {paper['abstract']}")
        md.append("") # Spacer
        
    return "\n".join(md)

def main():
    parser = argparse.ArgumentParser(description="学术文献检索工具 (支持 arXiv 与 PubMed)")
    parser.add_argument("query", type=str, nargs="?", help="检索关键词")
    parser.add_argument("--query", "-q", type=str, dest="query_opt", help="检索关键词（替代位置参数）")
    parser.add_argument("--source", "-s", choices=["arxiv", "pubmed", "all"], default="all", help="文献来源数据源")
    parser.add_argument("--limit", "-l", type=int, default=5, help="每个数据源的最大返回数量")
    parser.add_argument("--output", "-o", type=str, help="输出文件路径 (.md 格式)")
    
    args = parser.parse_args()
    
    query = args.query or args.query_opt
    if not query:
        print("[!] 错误: 请指定检索关键词。", file=sys.stderr)
        parser.print_help()
        sys.exit(1)
        
    papers = []
    if args.source in ["arxiv", "all"]:
        papers.extend(search_arxiv(query, args.limit))
    if args.source in ["pubmed", "all"]:
        papers.extend(search_pubmed(query, args.limit))
        
    papers = deduplicate_papers(papers)
    
    markdown_out = format_markdown(papers)
    
    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(markdown_out)
            print(f"[*] 结果已成功写入到: {args.output}")
        except Exception as e:
            print(f"[!] 写入文件失败: {e}", file=sys.stderr)
            print(markdown_out)
    else:
        print(markdown_out)

if __name__ == "__main__":
    main()
