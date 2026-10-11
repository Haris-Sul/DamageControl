# Damage Control - Quick Start Guide

Follow these steps to run the app and test out some public relations strategies.

## Prerequisites
* Python 3.x installed
* Node.js and npm installed

---

## 1. Run the Python/Flask Backend

Open your terminal in the project root, then run:

```bash
cd backend
# Windows PowerShell:
.\venv\Scripts\Activate
# Mac / Linux:
# source venv/bin/activate

pip install -r requirements.txt
python app.py
```

---

## 2. Run the Phaser Frontend

Open a **second, separate terminal window** in the project root, and run:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL provided by Vite (usually `http://localhost:5173`) and you're ready to go!
