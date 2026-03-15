# 🐃 Narayana Organic Dairy — Farm Management System

Buffalo dairy farm management: milk production, health records, finance, vendor payments, and partner login with OTP.

---

## 🚀 Option A — Run Locally (Windows, with Python)

### First time only
1. Install **Python 3.10+** from [python.org](https://www.python.org/downloads/)  
   ⚠️ During install, check **"Add Python to PATH"**
2. Double-click **`SETUP.bat`** — installs all dependencies automatically
3. Double-click **`START.bat`** — starts the app and opens your browser

### Every time after that
Just double-click **`START.bat`**.

The app runs at `http://localhost:8000` (or 8001/8002 if that port is busy).  
Your data is stored in `farm.db` (SQLite) in the same folder.

---

## 🖥️ Option B — Standalone .EXE (No Python needed)

Download the latest `.zip` from the **[Releases](../../releases)** page, extract it, and run `NarayanaDairy.exe`.

No Python, no setup — everything is bundled inside.

---

## 📦 Build the .EXE yourself (GitHub Actions)

The `.exe` is built automatically when you push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will:
1. Build `NarayanaDairy.exe` using PyInstaller on Windows
2. Zip the output
3. Publish it as a **GitHub Release** with download links

You can also trigger the build manually from the **Actions** tab → **Build Windows EXE** → **Run workflow**.

---

## 📁 Project Structure

```
narayana/
├── main.py           ← FastAPI app & all API routes
├── models.py         ← SQLAlchemy database models
├── schemas.py        ← Pydantic request/response schemas
├── auth.py           ← OTP login, JWT tokens, email sending
├── database.py       ← SQLite connection setup
├── partners.json     ← Partner names, emails, SMTP config
├── farm.db           ← SQLite database (auto-created)
├── launcher.py       ← Entry point for .exe build
├── narayana.spec     ← PyInstaller build configuration
├── requirements.txt  ← Python dependencies
├── SETUP.bat         ← First-time Windows setup
├── START.bat         ← Daily launcher (Windows)
├── static/
│   ├── index.html    ← Main app UI
│   ├── login.html    ← Login page
│   ├── styles.css    ← Custom styles
│   ├── app.js        ← Frontend JavaScript
│   ├── sw.js         ← Service worker (PWA)
│   └── manifest.json ← PWA manifest
└── .github/
    └── workflows/
        └── build.yml ← GitHub Actions build pipeline
```

---

## ⚙️ Configuration (`partners.json`)

```json
{
  "partners": [
    { "name": "upender rao", "email": "partner1@gmail.com" },
    { "name": "naresh",      "email": "partner2@gmail.com" }
  ],
  "otp_delivery_email": "partner2@gmail.com",
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 465,
    "username": "youremail@gmail.com",
    "password": "your-app-password",
    "from_email": "youremail@gmail.com"
  }
}
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App Passwords → generate one for "Mail".

---

## 💾 Backing Up Your Data

Your entire database is in a single file: **`farm.db`**

Copy this file to Google Drive / USB regularly. To restore, just replace the file.

---

## 🌐 LAN Access (Other Devices on Same WiFi)

The server binds to `0.0.0.0`, so any device on the same network can access it:

1. Find your PC's IP: open Command Prompt → type `ipconfig` → look for **IPv4 Address** (e.g. `192.168.1.5`)
2. On any phone/tablet on the same WiFi, open: `http://192.168.1.5:8000`

---

## 📋 Features

| Module | What it does |
|---|---|
| **Dashboard** | Live stats: buffaloes, today's milk, monthly P&L, vaccination alerts |
| **Roster** | Add/manage buffalo records with tag, breed, DOB, pregnancy status |
| **Milk Entry** | Log morning + evening milk per buffalo; auto-totals |
| **Finance** | Record milk sales (income) + expenses; downloadable Excel ledger |
| **Health** | Vaccination, treatment, pregnancy check records with due-date alerts |
| **Vendors** | Track purchases, payments, outstanding balances |
| **Vendor Ledger** | Payment installment tracking per vendor |
| **Reports** | Full monthly Excel report (5 sheets: summary, milk, income, expenses, vendors) |
| **Login Audit** | Logs every partner login with date/time |

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn, SQLAlchemy, SQLite
- **Frontend**: Vanilla JS, Tailwind CSS, Chart.js, Font Awesome
- **Auth**: JWT + 6-digit OTP via email (Gmail SMTP)
- **Reports**: openpyxl (Excel generation)
- **Desktop**: PyInstaller (Windows .exe bundling)
