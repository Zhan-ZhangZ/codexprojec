#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import urllib.request
import tarfile
import zipfile
import gzip
import shutil
import argparse
import tempfile
import re

def clean_arxiv_id(arxiv_id):
    """
    Standardize arXiv ID format, e.g. "2303.12345v1" -> "2303.12345" or "hep-th/9912012"
    """
    # Remove version suffix like v1, v2
    arxiv_id = re.sub(r'v\d+$', '', arxiv_id.strip())
    # Remove leading URL if user passed a full URL
    arxiv_id = arxiv_id.split('/')[-1]
    if 'abs' in arxiv_id or 'pdf' in arxiv_id:
        # If it was a URL like arxiv.org/abs/2303.12345, the split might yield 2303.12345
        match = re.search(r'(\d{4}\.\d{4,5}|[a-z\-]+(?:\.[A-Z]{2})?/\d{7})', arxiv_id)
        if match:
            return match.group(0)
    return arxiv_id

def download_source(arxiv_id, dest_path):
    """
    Download arXiv source package
    """
    url = f"https://arxiv.org/src/{arxiv_id}"
    print(f"[*] 正在从 {url} 下载 LaTeX 源码包...", file=sys.stderr)
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            # Check content-type
            content_type = response.headers.get('Content-Type', '')
            if 'pdf' in content_type.lower():
                print("[!] 警告: arXiv 返回了 PDF 格式，该论文可能未提供 LaTeX 源码。", file=sys.stderr)
                
            with open(dest_path, 'wb') as f:
                f.write(response.read())
        print(f"[*] 源码包下载成功，保存至: {dest_path}", file=sys.stderr)
        return True
    except Exception as e:
        print(f"[!] 下载失败: {e}", file=sys.stderr)
        return False

def extract_source(archive_path, extract_dir):
    """
    Try multiple extraction methods (tar.gz, zip, gz, raw tex)
    """
    os.makedirs(extract_dir, exist_ok=True)
    
    # 1. Try Tarfile
    try:
        with tarfile.open(archive_path, 'r:gz') as tar:
            tar.extractall(path=extract_dir)
        print(f"[*] 成功通过 tar.gz 格式解压到: {extract_dir}", file=sys.stderr)
        return True
    except Exception:
        pass

    try:
        with tarfile.open(archive_path, 'r') as tar:
            tar.extractall(path=extract_dir)
        print(f"[*] 成功通过 tar 格式解压到: {extract_dir}", file=sys.stderr)
        return True
    except Exception:
        pass

    # 2. Try Zipfile
    try:
        with zipfile.ZipFile(archive_path, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        print(f"[*] 成功通过 zip 格式解压到: {extract_dir}", file=sys.stderr)
        return True
    except Exception:
        pass

    # 3. Try Gzip (Single file)
    try:
        out_file_path = os.path.join(extract_dir, "main.tex")
        with gzip.open(archive_path, 'rb') as f_in:
            content = f_in.read()
            # Verify if it looks like latex
            if b'\\documentclass' in content or b'\\document' in content or b'%' in content:
                with open(out_file_path, 'wb') as f_out:
                    f_out.write(content)
                print(f"[*] 成功通过 gzip 格式解压单个 LaTeX 文件至: {out_file_path}", file=sys.stderr)
                return True
    except Exception:
        pass

    # 4. Try as raw TeX file (sometimes it's not compressed)
    try:
        with open(archive_path, 'rb') as f:
            content = f.read()
        if b'\\documentclass' in content or b'\\begin{document}' in content:
            out_file_path = os.path.join(extract_dir, "main.tex")
            with open(out_file_path, 'wb') as f_out:
                f_out.write(content)
            print(f"[*] 源码本身为未压缩的 .tex 文件，已复制到: {out_file_path}", file=sys.stderr)
            return True
    except Exception:
        pass

    return False

def search_formulas(extract_dir, query):
    """
    Search inside extracted LaTeX files for formulas or text matches
    """
    print(f"[*] 正在在 LaTeX 源码中检索关键词: '{query}'...", file=sys.stderr)
    matches = []
    
    # Compile a case-insensitive regex for the search
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    
    for root, _, files in os.walk(extract_dir):
        for file in files:
            if file.endswith(('.tex', '.sty', '.cls')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = f.readlines()
                    
                    for line_num, line in enumerate(lines, 1):
                        if pattern.search(line):
                            matches.append({
                                'file': os.path.relpath(file_path, extract_dir),
                                'line': line_num,
                                'content': line.strip()
                            })
                except Exception as e:
                    print(f"[!] 读取文件 {file} 错误: {e}", file=sys.stderr)
                    
    return matches

def list_equations(extract_dir):
    """
    Scan LaTeX files and extract math equations (between $$ or in equation environments)
    """
    print("[*] 正在扫描 LaTeX 源码中的数学公式...", file=sys.stderr)
    equations = []
    
    # Regex for equations:
    # 1. $$ ... $$
    # 2. \begin{equation} ... \end{equation}
    # 3. \begin{align} ... \end{align}
    # 4. \[ ... \]
    
    eq_regex = re.compile(
        r'(\$\$.*?\$\$|\\\[.*?\\\]|\\begin\{equation\}.*?\\end\{equation\}|\\begin\{align\}.*?\\end\{align\}|\\begin\{equation\*\}.*?\\end\{equation\*\}|\\begin\{align\*\}.*?\\end\{align\*\})',
        re.DOTALL
    )
    
    for root, _, files in os.walk(extract_dir):
        for file in files:
            if file.endswith('.tex'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        
                    # Find all matches
                    matches = eq_regex.findall(content)
                    for m in matches:
                        cleaned_eq = re.sub(r'\s+', ' ', m).strip()
                        # Shorten for preview if extremely long
                        if len(cleaned_eq) > 500:
                            preview = cleaned_eq[:497] + "..."
                        else:
                            preview = cleaned_eq
                        equations.append({
                            'file': os.path.relpath(file_path, extract_dir),
                            'equation': preview
                        })
                except Exception as e:
                    print(f"[!] 读取 {file} 发生错误: {e}", file=sys.stderr)
                    
    return equations

def main():
    parser = argparse.ArgumentParser(description="arXiv LaTeX 源码包下载与数学公式解析工具")
    parser.add_argument("arxiv_id", type=str, nargs="?", help="arXiv 论文 ID (例如: 2303.12345)")
    parser.add_argument("--arxiv-id", "-i", type=str, dest="id_opt", help="arXiv 论文 ID (替代位置参数)")
    parser.add_argument("--output-dir", "-o", type=str, help="LaTeX 源码解压的目标目录")
    parser.add_argument("--search", "-s", type=str, help="在 LaTeX 源码中搜索特定的公式或文本")
    parser.add_argument("--list-eqs", "-e", action="store_true", help="列出文中检测到的数学公式/环境")
    
    args = parser.parse_args()
    
    arxiv_id = args.arxiv_id or args.id_opt
    if not arxiv_id:
        print("[!] 错误: 请指定 arXiv ID。", file=sys.stderr)
        parser.print_help()
        sys.exit(1)
        
    arxiv_id = clean_arxiv_id(arxiv_id)
    print(f"[*] 规范化后的 arXiv ID: {arxiv_id}", file=sys.stderr)
    
    # Set default output dir if not specified
    if args.output_dir:
        output_dir = args.output_dir
    else:
        output_dir = os.path.join(os.getcwd(), f"{arxiv_id.replace('/', '_')}_latex")
        
    # Create a temporary file for the downloaded archive
    with tempfile.NamedTemporaryFile(delete=False) as temp_archive:
        temp_archive_path = temp_archive.name
        
    try:
        if not download_source(arxiv_id, temp_archive_path):
            sys.exit(1)
            
        print(f"[*] 正在解压至: {output_dir}...", file=sys.stderr)
        if not extract_source(temp_archive_path, output_dir):
            print("[!] 错误: 无法识别源码包格式或解压失败。可能是因为该论文仅提供 PDF。", file=sys.stderr)
            sys.exit(1)
            
        print(f"\n# arXiv {arxiv_id} LaTeX 源码解析成功\n")
        print(f"- **解压目录**: `{output_dir}`")
        
        # List files extracted
        extracted_files = []
        for root, _, files in os.walk(output_dir):
            for file in files:
                extracted_files.append(os.path.relpath(os.path.join(root, file), output_dir))
        print(f"- **解压文件数**: {len(extracted_files)} 个文件")
        print("- **主要 .tex 文件**:")
        tex_files = [f for f in extracted_files if f.endswith('.tex')]
        for tf in tex_files[:5]:
            print(f"  - `{tf}`")
        if len(tex_files) > 5:
            print(f"  - ... 及其他 {len(tex_files) - 5} 个 .tex 文件")
        print("")
        
        # Search query
        if args.search:
            matches = search_formulas(output_dir, args.search)
            print(f"## 搜索结果 (关键词: '{args.search}', 匹配项: {len(matches)})\n")
            if matches:
                for idx, match in enumerate(matches[:15], 1):
                    print(f"{idx}. **文件**: `{match['file']}` (第 {match['line']} 行)")
                    print(f"   ```latex\n   {match['content']}\n   ```\n")
                if len(matches) > 15:
                    print(f"*...仅显示前 15 条结果，其余 {len(matches) - 15} 条已省略。*")
            else:
                print("未找到匹配行。")
                
        # List equations
        if args.list_eqs:
            equations = list_equations(output_dir)
            print(f"## 检测到的 LaTeX 数学公式环境 (共 {len(equations)} 个)\n")
            if equations:
                for idx, eq in enumerate(equations[:15], 1):
                    print(f"{idx}. **文件**: `{eq['file']}`")
                    print(f"   ```latex\n   {eq['equation']}\n   ```\n")
                if len(equations) > 15:
                    print(f"*...仅显示前 15 个公式，其余 {len(equations) - 15} 个已省略。*")
            else:
                print("未检测到标准数学环境。")
                
    finally:
        # Clean up temp file
        if os.path.exists(temp_archive_path):
            os.remove(temp_archive_path)

if __name__ == "__main__":
    main()
