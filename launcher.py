"""
launcher.py — Entry point for PyInstaller .exe build
Starts the FastAPI server and opens the browser automatically.
"""
import os
import sys
import time
import socket
import threading
import webbrowser

# ── Resolve base path (works both in dev and frozen .exe) ─────────────────────
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS          # PyInstaller temp extraction dir
    # Also set working dir to the folder containing the .exe so farm.db and
    # partners.json are found/created next to the executable, not in temp.
    os.chdir(os.path.dirname(sys.executable))
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    os.chdir(BASE_DIR)

# Add base dir to sys.path so the app modules resolve correctly
sys.path.insert(0, BASE_DIR)


def find_free_port(start: int = 8000, attempts: int = 10) -> int:
    """Return the first free TCP port starting from `start`."""
    for port in range(start, start + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start  # fallback — let uvicorn raise the error


def open_browser(port: int, delay: float = 2.0):
    """Open the default browser after a short delay."""
    time.sleep(delay)
    webbrowser.open(f"http://localhost:{port}")


def ensure_static():
    """
    When running as a frozen .exe, static files are bundled inside _MEIPASS.
    We need to make sure the `static/` folder next to the .exe also contains
    the files so FastAPI's StaticFiles mount (which reads from disk) works.
    """
    src_static = os.path.join(BASE_DIR, 'static')
    dst_static = os.path.join(os.getcwd(), 'static')

    if os.path.isdir(src_static) and src_static != dst_static:
        import shutil
        if not os.path.exists(dst_static):
            shutil.copytree(src_static, dst_static)

    if not os.path.exists(dst_static):
        os.makedirs(dst_static, exist_ok=True)

    # Ensure partners.json exists next to exe
    partners_dst = os.path.join(os.getcwd(), 'partners.json')
    partners_src = os.path.join(BASE_DIR, 'partners.json')
    if not os.path.exists(partners_dst) and os.path.exists(partners_src):
        import shutil
        shutil.copy2(partners_src, partners_dst)


if __name__ == '__main__':
    ensure_static()

    port = find_free_port(8000)

    print("=" * 60)
    print("  NARAYANA ORGANIC DAIRY")
    print("  Buffalo Farm Management System")
    print("=" * 60)
    print(f"\n  Server starting on: http://localhost:{port}")
    print("  Browser will open automatically.\n")
    print("  To stop the app, close this window.\n")
    print("=" * 60)

    # Open browser in background thread
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    # Start uvicorn
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,        # No reload in frozen exe
        log_level="info",
    )
