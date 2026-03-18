"""
launcher.py — Entry point for PyInstaller .exe build
CRITICAL: No code inside `if __name__ == '__main__':` —
PyInstaller frozen exe does not execute that guard.
All startup code must be at module level.
"""
import os
import sys
import time
import socket
import shutil
import threading
import webbrowser
import multiprocessing

# MUST be first line — required for PyInstaller + multiprocessing on Windows
multiprocessing.freeze_support()

# ── Resolve paths ──────────────────────────────────────────────────────────────
IS_FROZEN  = getattr(sys, 'frozen', False)
BUNDLE_DIR = sys._MEIPASS if IS_FROZEN else os.path.dirname(os.path.abspath(__file__))
EXE_DIR    = os.path.dirname(sys.executable) if IS_FROZEN else BUNDLE_DIR

# Working directory = folder containing the .exe (farm.db lives here)
os.chdir(EXE_DIR)

# Both dirs on sys.path so all app imports resolve
for _p in [BUNDLE_DIR, EXE_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)


# ── Copy bundled files to exe folder on first run ─────────────────────────────
def ensure_files():
    """
    PyInstaller extracts static/ into _MEIPASS (a temp dir).
    FastAPI StaticFiles reads from DISK not from _MEIPASS.
    So we copy static/ next to the .exe on first run.
    """
    src_static = os.path.join(BUNDLE_DIR, 'static')
    dst_static = os.path.join(EXE_DIR,    'static')
    if os.path.isdir(src_static) and not os.path.isdir(dst_static):
        print("  First run: extracting static files next to exe...")
        shutil.copytree(src_static, dst_static)
        print("  Done.")
    for fname in ['partners.json', 'farm.db']:
        src = os.path.join(BUNDLE_DIR, fname)
        dst = os.path.join(EXE_DIR,    fname)
        if os.path.exists(src) and not os.path.exists(dst):
            shutil.copy2(src, dst)


def find_free_port(start=8000, attempts=10):
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start


def open_browser(port, delay=2.5):
    time.sleep(delay)
    webbrowser.open(f"http://localhost:{port}")


# ── All startup code at module level (not inside __main__) ────────────────────
ensure_files()

PORT = find_free_port(8000)

print("=" * 60)
print("  NARAYANA ORGANIC DAIRY")
print("  Buffalo Farm Management System")
print("=" * 60)
print(f"\n  Server: http://localhost:{PORT}")
print("  Browser opens automatically.")
print("  Close this window to stop the app.\n")
print("=" * 60)

threading.Thread(target=open_browser, args=(PORT,), daemon=True).start()

import uvicorn
uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=False, log_level="info")
