# NEXUS CORE — Full Project

Two separate applications, two separate repos when you push to GitHub:

- `backend/`  — FastAPI + SQLite orchestration API (Python)
- `frontend/` — Next.js Command Center UI (TypeScript)

## Quick start

```bash
# Terminal 1
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in QWEN_API_KEY at minimum
uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend
npm install
cp .env.local.example .env.local   # fill in Clerk keys + NEXT_PUBLIC_NEXUS_API_URL
npm run dev
```

Full details, API reference, and known limitations are in each folder's own
README.md — read both before your demo.

## Pushing to GitHub (two separate repos)

```bash
cd backend
git init && git add . && git commit -m "NEXUS CORE backend"
git remote add origin <your-backend-repo-url>
git push -u origin main

cd ../frontend
git init && git add . && git commit -m "NEXUS CORE frontend"
git remote add origin <your-frontend-repo-url>
git push -u origin main
```
