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
print("  [4/4] Google Fonts (Inter + Outfit)")

# These are stable woff2 file URLs from Google's CDN
font_files = {
    # Inter
    "Inter-Light.woff2":    "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
    "Inter-Regular.woff2":  "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ.woff2",
    "Inter-Medium.woff2":   "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI13AZ9hiA.woff2",
    "Inter-SemiBold.woff2": "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2",
    # Outfit
    "Outfit-Regular.woff2":  "https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.woff2",
    "Outfit-SemiBold.woff2": "https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.woff2",
    "Outfit-Bold.woff2":     "https://fonts.gstatic.com/s/outfit/v11/QGYyz_MVcBeNP4NjuGObqx1XmO1I4TC1C4G-EiAou6Y.woff2",
}

font_ok = True
for fname, url in font_files.items():
    if not dl(url, os.path.join(FONTS_DIR, fname), f"  {fname}"):
        font_ok = False

# Write fonts.css — references local woff2 files
if font_ok:
    fonts_css = """\
/* Offline fonts — Inter + Outfit served locally */
@font-face { font-family:'Inter'; font-weight:300; font-display:swap;
  src: url('fonts/Inter-Light.woff2') format('woff2'); }
@font-face { font-family:'Inter'; font-weight:400; font-display:swap;
  src: url('fonts/Inter-Regular.woff2') format('woff2'); }
@font-face { font-family:'Inter'; font-weight:500; font-display:swap;
  src: url('fonts/Inter-Medium.woff2') format('woff2'); }
@font-face { font-family:'Inter'; font-weight:600; font-display:swap;
  src: url('fonts/Inter-SemiBold.woff2') format('woff2'); }
@font-face { font-family:'Outfit'; font-weight:400; font-display:swap;
  src: url('fonts/Outfit-Regular.woff2') format('woff2'); }
@font-face { font-family:'Outfit'; font-weight:600; font-display:swap;
  src: url('fonts/Outfit-SemiBold.woff2') format('woff2'); }
@font-face { font-family:'Outfit'; font-weight:700; font-display:swap;
  src: url('fonts/Outfit-Bold.woff2') format('woff2'); }
"""
else:
    # Graceful fallback to system fonts if downloads failed
    fonts_css = """\
/* Offline fonts — system fallback (font downloads failed, run SETUP.bat again) */
"""
    errors += 1

with open(os.path.join(VENDOR, "fonts.css"), "w", encoding="utf-8") as f:
    f.write(fonts_css)
print("       fonts.css written.")

# ── Summary ───────────────────────────────────────────────────────────────────
print()
if errors == 0:
    print("  All offline assets downloaded successfully.")
    print("  The app will now run with zero internet dependency.")
else:
    print(f"  WARNING: {errors} download(s) failed.")
    print("  Fix your internet connection and run SETUP.bat again.")

sys.exit(errors)
