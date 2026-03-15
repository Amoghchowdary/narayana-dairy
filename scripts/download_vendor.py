"""
scripts/download_vendor.py
Downloads all frontend libraries needed for offline operation.
Run via SETUP.bat — requires internet only this one time.
"""
import os
import re
import sys
import shutil
import urllib.request

VENDOR     = os.path.join("static", "vendor")
WEBFONTS   = os.path.join(VENDOR, "webfonts")
FONTS_DIR  = os.path.join(VENDOR, "fonts")

for d in [VENDOR, WEBFONTS, FONTS_DIR]:
    os.makedirs(d, exist_ok=True)

errors = 0


def dl(url: str, dest: str, label: str = "") -> bool:
    fname = label or os.path.basename(dest)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        print(f"       {fname} — already cached, skipping.")
        return True
    try:
        print(f"       Downloading {fname} ...", end="", flush=True)
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r, open(dest, "wb") as f:
            shutil.copyfileobj(r, f)
        size = os.path.getsize(dest) // 1024
        print(f" OK ({size} KB)")
        return True
    except Exception as e:
        print(f" FAILED\n         Error: {e}")
        return False


# ── 1. Tailwind CSS standalone ────────────────────────────────────────────────
print("  [1/4] Tailwind CSS")
ok = dl(
    "https://cdn.tailwindcss.com/3.4.1",
    os.path.join(VENDOR, "tailwind.min.js"),
    "tailwind.min.js"
)
if not ok:
    errors += 1

# ── 2. Chart.js ──────────────────────────────────────────────────────────────
print("  [2/4] Chart.js")
ok = dl(
    "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js",
    os.path.join(VENDOR, "chart.min.js"),
    "chart.min.js"
)
if not ok:
    errors += 1

# ── 3. Font Awesome CSS + webfonts ────────────────────────────────────────────
print("  [3/4] Font Awesome")
FA_BASE = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0"
fa_css_path = os.path.join(VENDOR, "font-awesome.min.css")

ok = dl(f"{FA_BASE}/css/all.min.css", fa_css_path, "font-awesome.min.css")
if ok:
    # Download webfonts
    webfonts = [
        "fa-solid-900.woff2", "fa-regular-400.woff2", "fa-brands-400.woff2",
        "fa-solid-900.ttf",   "fa-regular-400.ttf",   "fa-brands-400.ttf",
    ]
    for wf in webfonts:
        dl(f"{FA_BASE}/webfonts/{wf}", os.path.join(WEBFONTS, wf), f"  {wf}")

    # Patch CSS — replace ANY existing webfont path (CDN or relative) with
    # the absolute URL path FastAPI serves: /static/vendor/webfonts/
    # This handles both the full CDN URL and any relative "../webfonts/" variants.
    with open(fa_css_path, "r", encoding="utf-8") as f:
        css = f.read()
    css_fixed = re.sub(
        r'(?:https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/6\.4\.0/webfonts/|'
        r'(?:\.\./)*webfonts/)',
        '/static/vendor/webfonts/',
        css,
    )
    with open(fa_css_path, "w", encoding="utf-8") as f:
        f.write(css_fixed)
    print("       Webfont paths patched for offline use.")
else:
    errors += 1

# ── 4. Google Fonts (Inter + Outfit) ─────────────────────────────────────────
# Fonts are optional — failures never block the build.
print("  [4/4] Google Fonts (Inter + Outfit)")

FONTS_DIR = os.path.join(VENDOR, "fonts")
os.makedirs(FONTS_DIR, exist_ok=True)

_font_apis = [
    ("Inter",  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap"),
    ("Outfit", "https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap"),
]
_downloaded_fonts = []
import re as _re
for family, api_url in _font_apis:
    try:
        req = urllib.request.Request(api_url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        with urllib.request.urlopen(req, timeout=15) as r:
            css_text = r.read().decode("utf-8")
        for block in _re.split(r'@font-face', css_text)[1:]:
            wm = _re.search(r'font-weight:\s*(\d+)', block)
            um = _re.search(r"url\(([^)]+\.woff2[^)]*)\)", block)
            if wm and um:
                weight = wm.group(1)
                url    = um.group(1).strip("'\"")
                fname  = f"{family}-w{weight}.woff2"
                dest   = os.path.join(FONTS_DIR, fname)
                if dl(url, dest, f"  {fname}"):
                    _downloaded_fonts.append((family, weight, fname))
        print(f"       {family} done.")
    except Exception as e:
        print(f"       {family} — skipped ({e})")

_font_faces = "".join(
    f"@font-face{{font-family:'{fam}';font-weight:{w};font-display:swap;"
    f"src:url('fonts/{fn}') format('woff2');}}\n"
    for fam, w, fn in _downloaded_fonts
    if os.path.exists(os.path.join(FONTS_DIR, fn))
) or "/* Google Fonts unavailable — system fonts active */\n"

with open(os.path.join(VENDOR, "fonts.css"), "w", encoding="utf-8") as f:
    f.write(_font_faces)
print("       fonts.css written.")

# ── Summary ───────────────────────────────────────────────────────────────────
print()
if errors == 0:
    print("  All offline assets downloaded successfully.")
    print("  The app will now run with zero internet dependency.")
else:
    print(f"  NOTE: {errors} optional asset(s) could not be downloaded.")
    print("  The app will still work — system fonts will be used as fallback.")

# Always exit 0 — font failures are non-fatal, app works without them
sys.exit(0)
