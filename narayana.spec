# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for Narayana Organic Dairy
# Builds a single-folder distribution with the FastAPI server bundled

import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect all data files needed
added_files = [
    ('static', 'static'),          # includes static/vendor/ offline assets
    ('partners.json', '.'),
    ('farm.db', '.'),
]

# Hidden imports for FastAPI / Uvicorn / SQLAlchemy
hidden_imports = [
    'uvicorn',
    'uvicorn.main',
    'uvicorn.config',
    'uvicorn.lifespan',
    'uvicorn.lifespan.off',
    'uvicorn.lifespan.on',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.protocols.websockets.websockets_impl',
    'uvicorn.logging',
    'fastapi',
    'sqlalchemy',
    'sqlalchemy.dialects.sqlite',
    'sqlalchemy.orm',
    'pydantic',
    'email.mime.text',
    'email.mime.multipart',
    'smtplib',
    'openpyxl',
    'jwt',
    'passlib',
    'passlib.handlers',
    'passlib.handlers.bcrypt',
    'multipart',
    'anyio',
    'anyio._backends._asyncio',
    'starlette',
    'starlette.routing',
    'starlette.staticfiles',
    'starlette.responses',
    'starlette.middleware',
    'starlette.middleware.cors',
    'h11',
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
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

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
    console=True,   # Keep True so you can see logs/errors
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
