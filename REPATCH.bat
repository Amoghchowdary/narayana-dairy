@echo off
title Narayana Dairy - Fix Font Awesome Icons
color 0A

echo.
echo  ============================================================
echo   NARAYANA ORGANIC DAIRY - ICON FIX
echo   Fixes the "missing icons" issue from earlier setup.
echo  ============================================================
echo.

if not exist static\vendor\font-awesome.min.css (
    echo  [!] font-awesome.min.css not found.
    echo      Please run SETUP.bat first.
    pause & exit /b 1
)

call venv\Scripts\activate.bat

python -c "
import re, os

css_path = os.path.join('static', 'vendor', 'font-awesome.min.css')
with open(css_path, 'r', encoding='utf-8') as f:
    css = f.read()

# Replace any webfont path variant with the correct absolute URL path
fixed = re.sub(
    r'(?:https://cdnjs\.cloudflare\.com/ajax/libs/font-awesome/6\.4\.0/webfonts/'
    r'|(?:\.\./)*webfonts/)',
    '/static/vendor/webfonts/',
    css,
)

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(fixed)

count = fixed.count('/static/vendor/webfonts/')
print(f'  Patched {count} webfont path(s) to /static/vendor/webfonts/')
print('  Done.')
"

echo.
echo  Icons fix applied. Start the app normally with START.bat.
echo.
pause
