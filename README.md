# CodeNPost - Setup Guide

## 1. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in .env with your real values (see below)
npm run dev
```
Backend runs on http://localhost:5001

## 2. Frontend setup
No build step needed - it's plain HTML/CSS/JS.
Open `frontend/index.html` directly in a browser, or serve it:
```bash
cd frontend
npx serve .
```

## 3. Getting your API keys

**MongoDB**: Create a free cluster at mongodb.com/cloud/atlas, get the connection string.

**GitHub Token**: GitHub Settings → Developer Settings → Personal Access Tokens →
generate one with `public_repo` / `read:user` scope.

**Gemini API Key**: aistudio.google.com/apikey - free tier available.

**LinkedIn OAuth App**: linkedin.com/developers/apps → Create app →
under "Auth" tab, add redirect URL `http://localhost:5000/api/linkedin/callback`,
request the "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn"
products (may require review/approval - start this early).

## Architecture recap
1. User signs up, links GitHub/LeetCode usernames, connects LinkedIn (OAuth).
2. User clicks "Generate" (or the daily cron job runs) → backend fetches recent
   commits/solved problems → sends to Gemini → saves as a draft Post.
3. User reviews/edits the draft in the dashboard.
4. User clicks "Publish" → backend posts to LinkedIn via their API → status updated.
