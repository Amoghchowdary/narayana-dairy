# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec — Narayana Organic Dairy v1.0.4
# Compatible with PyInstaller 6.x

added_files = [
    ('static',        'static'),
    ('partners.json', '.'),
    ('farm.db',       '.'),
]

hidden_imports = [
    # Uvicorn
    'uvicorn', 'uvicorn.main', 'uvicorn.config',
    'uvicorn.lifespan', 'uvicorn.lifespan.off', 'uvicorn.lifespan.on',
    'uvicorn.loops', 'uvicorn.loops.auto', 'uvicorn.loops.asyncio',
    'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
    'uvicorn.protocols.websockets.websockets_impl', 'uvicorn.logging',
    # FastAPI / Starlette
    'fastapi', 'fastapi.routing', 'fastapi.middleware', 'fastapi.middleware.cors',
    'starlette', 'starlette.routing', 'starlette.staticfiles',
    'starlette.responses', 'starlette.middleware', 'starlette.middleware.cors',
    'starlette.background', 'starlette.concurrency', 'starlette.datastructures',
    # SQLAlchemy
    'sqlalchemy', 'sqlalchemy.dialects.sqlite', 'sqlalchemy.orm',
    'sqlalchemy.ext.declarative',
    # Pydantic
    'pydantic', 'pydantic.deprecated.class_validators',
    # Auth / Email
    'jwt', 'passlib', 'passlib.handlers', 'passlib.handlers.bcrypt',
    'email.mime.text', 'email.mime.multipart', 'smtplib',
    # Other
    'openpyxl', 'multipart', 'python_multipart',
    'anyio', 'anyio._backends._asyncio', 'anyio._backends._thread',
    'h11', 'httptools', 'watchfiles', 'websockets',
    # App modules — explicitly listed so PyInstaller bundles them
    'main', 'models', 'schemas', 'auth', 'database',
]

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=added_files,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'test', 'unittest'],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='NarayanaDairy',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='NarayanaDairy',
)
