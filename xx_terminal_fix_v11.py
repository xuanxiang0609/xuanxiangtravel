#!/usr/bin/env python3
from pathlib import Path
import hashlib, json, shutil, re
from datetime import datetime

ROOT = Path.cwd()
REPORT_DIR = ROOT / "reports"
REPORT_DIR.mkdir(exist_ok=True)

log = {
    "time": datetime.now().isoformat(),
    "root": str(ROOT),
    "removed_mac_junk": [],
    "removed_duplicate_files": [],
    "merged_duplicate_dirs": [],
    "conflicts": [],
    "garbled_names": [],
    "kept_files": []
}

def sha256(p: Path):
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def is_garbled_name(name: str):
    # 常見亂碼特徵：問號、方塊符、錯誤解碼後的希臘/框線符號、奇怪控制字元
    suspicious = ["?", "�", "╛", "╜", "╣", "╡", "╫", "Σ", "Φ", "µ", "σ", "τ", "¿", "«", "┐", "┤", "╕"]
    return any(s in name for s in suspicious)

def base_without_copy2(p: Path):
    stem = p.stem
    suffix = p.suffix
    if stem.endswith(" 2"):
        return p.with_name(stem[:-2].rstrip() + suffix)
    return None

def safe_remove_file(p: Path):
    try:
        p.unlink()
        return True
    except Exception as e:
        log["conflicts"].append({"path": str(p), "reason": f"remove failed: {e}"})
        return False

# 1. 移除 Mac 壓縮垃圾與系統縮圖
for p in sorted(ROOT.rglob("*"), key=lambda x: len(str(x)), reverse=True):
    name = p.name
    if name == "__MACOSX" and p.is_dir():
        shutil.rmtree(p, ignore_errors=True)
        log["removed_mac_junk"].append(str(p))
    elif name.startswith("._") or name in {"Thumbs.db", "desktop.ini", ".DS_Store"}:
        if p.exists():
            if p.is_dir():
                shutil.rmtree(p, ignore_errors=True)
            else:
                safe_remove_file(p)
            log["removed_mac_junk"].append(str(p))

# 2. 合併名稱結尾為「 2」的資料夾：例如 assets/css 2 -> assets/css
for d in sorted([x for x in ROOT.rglob("*") if x.is_dir() and x.name.endswith(" 2")], key=lambda x: len(str(x)), reverse=True):
    target = d.with_name(d.name[:-2].rstrip())
    if target.exists() and target.is_dir():
        for item in d.iterdir():
            dest = target / item.name
            if dest.exists():
                if item.is_file() and dest.is_file():
                    try:
                        if sha256(item) == sha256(dest):
                            safe_remove_file(item)
                            log["removed_duplicate_files"].append(str(item))
                        else:
                            log["conflicts"].append({
                                "path": str(item),
                                "target": str(dest),
                                "reason": "same name but different content"
                            })
                    except Exception as e:
                        log["conflicts"].append({"path": str(item), "reason": str(e)})
                elif item.is_dir() and dest.is_dir():
                    # 留給下一輪處理
                    pass
                else:
                    log["conflicts"].append({
                        "path": str(item),
                        "target": str(dest),
                        "reason": "file/dir type conflict"
                    })
            else:
                try:
                    shutil.move(str(item), str(dest))
                    log["merged_duplicate_dirs"].append({"from": str(item), "to": str(dest)})
                except Exception as e:
                    log["conflicts"].append({"path": str(item), "reason": f"move failed: {e}"})
        try:
            d.rmdir()
            log["merged_duplicate_dirs"].append({"removed_empty_dir": str(d)})
        except OSError:
            log["conflicts"].append({"path": str(d), "reason": "dir not empty after merge"})
    elif not target.exists():
        # 沒有原資料夾，就改名去掉 2
        try:
            d.rename(target)
            log["merged_duplicate_dirs"].append({"renamed_dir": str(d), "to": str(target)})
        except Exception as e:
            log["conflicts"].append({"path": str(d), "reason": f"rename failed: {e}"})

# 3. 刪除內容完全相同的「xxx 2.ext」檔案；不同內容不刪，避免誤殺
for p in sorted([x for x in ROOT.rglob("*") if x.is_file()], key=lambda x: str(x)):
    base = base_without_copy2(p)
    if base and base.exists() and base.is_file():
        try:
            if sha256(p) == sha256(base):
                safe_remove_file(p)
                log["removed_duplicate_files"].append(str(p))
            else:
                log["conflicts"].append({
                    "path": str(p),
                    "target": str(base),
                    "reason": "copy 2 file differs from original; kept for manual review"
                })
                log["kept_files"].append(str(p))
        except Exception as e:
            log["conflicts"].append({"path": str(p), "reason": str(e)})

# 4. 用 hash 找完全重複檔案，只刪明顯副本：包含「 2」或 Mac 垃圾名稱
hash_map = {}
for p in ROOT.rglob("*"):
    if p.is_file():
        try:
            h = sha256(p)
            hash_map.setdefault(h, []).append(p)
        except Exception as e:
            log["conflicts"].append({"path": str(p), "reason": str(e)})

for h, files in hash_map.items():
    if len(files) <= 1:
        continue
    files = sorted(files, key=lambda x: ((" 2" not in x.name), len(str(x)), str(x)))
    keep = files[-1]
    for f in files:
        if f == keep:
            continue
        if " 2" in f.name or f.name.startswith("._"):
            if f.exists():
                safe_remove_file(f)
                log["removed_duplicate_files"].append(str(f))
        else:
            log["conflicts"].append({
                "path": str(f),
                "same_as": str(keep),
                "reason": "same hash but not obvious copy; kept"
            })

# 5. 掃描亂碼名稱
for p in ROOT.rglob("*"):
    if is_garbled_name(p.name):
        log["garbled_names"].append(str(p))

# 6. 重新產生清單與 sitemap 初稿
html_files = sorted([p for p in ROOT.rglob("*.html") if "__MACOSX" not in str(p)])
css_files = sorted([p for p in ROOT.rglob("*.css") if "__MACOSX" not in str(p)])
js_files = sorted([p for p in ROOT.rglob("*.js") if "__MACOSX" not in str(p)])

(REPORT_DIR / "html-list-clean.txt").write_text("\n".join(str(p.relative_to(ROOT)) for p in html_files), encoding="utf-8")
(REPORT_DIR / "css-list-clean.txt").write_text("\n".join(str(p.relative_to(ROOT)) for p in css_files), encoding="utf-8")
(REPORT_DIR / "js-list-clean.txt").write_text("\n".join(str(p.relative_to(ROOT)) for p in js_files), encoding="utf-8")
(REPORT_DIR / "garbled-names.txt").write_text("\n".join(log["garbled_names"]), encoding="utf-8")

site_url = "https://xuanxiangtravel.com"
urls = []
for p in html_files:
    rel = p.relative_to(ROOT).as_posix()
    if rel.startswith(("admin/", "docs/", "reports/")):
        continue
    loc = "/" if rel == "index.html" else "/" + rel
    loc = loc.replace(" ", "%20")
    urls.append(f"""  <url>
    <loc>{site_url}{loc}</loc>
    <changefreq>weekly</changefreq>
    <priority>{'1.0' if rel == 'index.html' else '0.8'}</priority>
  </url>""")

sitemap = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
""" + "\n".join(urls) + """
</urlset>
"""
(ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")

(REPORT_DIR / "terminal-fix-v11-report.json").write_text(
    json.dumps(log, ensure_ascii=False, indent=2),
    encoding="utf-8"
)

print("✅ 修復完成")
print(f"移除 Mac 垃圾：{len(log['removed_mac_junk'])}")
print(f"移除完全重複檔：{len(log['removed_duplicate_files'])}")
print(f"合併/改名資料夾：{len(log['merged_duplicate_dirs'])}")
print(f"需人工確認衝突：{len(log['conflicts'])}")
print(f"疑似亂碼名稱：{len(log['garbled_names'])}")
print("報告：reports/terminal-fix-v11-report.json")
print("亂碼清單：reports/garbled-names.txt")
