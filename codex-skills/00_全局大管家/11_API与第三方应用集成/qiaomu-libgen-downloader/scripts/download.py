#!/usr/bin/env python3
"""从 LibGen.li 搜索和下载电子书"""
import subprocess, re, os, time, urllib.parse, argparse, sys, json

BASE = "https://libgen.li"

def curl(url, timeout=20):
    r = subprocess.run(
        ["curl", "-sL", "--max-time", str(timeout), url],
        capture_output=True, text=True, timeout=timeout + 5
    )
    return r.stdout

def search(query):
    """搜索并返回 MD5 列表"""
    url = f"{BASE}/index.php?req={urllib.parse.quote(query)}&open=0&res=25&view=simple&phrase=1&column=def"
    html = curl(url, timeout=20)
    if not html:
        return []
    return re.findall(r'href="/ads\.php\?md5=([a-f0-9]{32})"', html)

def get_download_url(md5):
    """从 ads 页面获取下载链接"""
    html = curl(f"{BASE}/ads.php?md5={md5}", timeout=20)
    if not html:
        return None
    m = re.search(r'href="(get\.php\?md5=[a-f0-9]{32}&key=[A-Z0-9]+)"', html)
    if m:
        return f"{BASE}/{m.group(1)}"
    return None

def download(query, output_dir=".", max_tries=3):
    """搜索并下载电子书"""
    print(f"🔍 搜索: {query}", flush=True)
    md5s = search(query)
    if not md5s:
        print("❌ 无搜索结果", file=sys.stderr)
        return None

    safe = re.sub(r'[^\w\s]', '', query.split()[0] + '_' + query.split()[-1])[:60]

    for i, md5 in enumerate(md5s[:max_tries]):
        dl_url = get_download_url(md5)
        if not dl_url:
            continue

        outfile = os.path.join(output_dir, f"{safe}.epub")
        r = subprocess.run(
            ["curl", "-sL", "--max-time", "60", "-o", outfile, dl_url],
            capture_output=True, text=True, timeout=90
        )

        if os.path.exists(outfile) and os.path.getsize(outfile) > 10000:
            size_mb = os.path.getsize(outfile) / 1024 / 1024
            print(f"✅ {outfile} ({size_mb:.1f}MB)", flush=True)
            return outfile
        else:
            if os.path.exists(outfile):
                os.remove(outfile)

    print("❌ 下载失败", file=sys.stderr)
    return None

def list_results(query):
    """只搜索，列出结果"""
    print(f"🔍 搜索: {query}", flush=True)
    md5s = search(query)
    if not md5s:
        print("❌ 无搜索结果")
        return
    print(f"找到 {len(md5s)} 个结果:")
    for i, md5 in enumerate(md5s[:10], 1):
        html = curl(f"{BASE}/ads.php?md5={md5}", timeout=15)
        title = "未知"
        if html:
            tm = re.search(r'<title>(.*?)</title>', html)
            if tm:
                title = tm.group(1)[:80]
        print(f"  {i}. {md5[:12]}... | {title}")
    time.sleep(1)

def main():
    parser = argparse.ArgumentParser(description="LibGen.li 电子书下载器")
    parser.add_argument("query", help="搜索关键词（书名 + 作者）")
    parser.add_argument("-o", "--output", default=".", help="输出目录")
    parser.add_argument("--list", action="store_true", help="只列出搜索结果")
    args = parser.parse_args()

    if args.list:
        list_results(args.query)
    else:
        result = download(args.query, args.output)
        if result:
            print(json.dumps({"ok": True, "file": result}))
        else:
            print(json.dumps({"ok": False}))
            sys.exit(1)

if __name__ == "__main__":
    main()
