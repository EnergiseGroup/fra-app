# Energise Group — Fire Risk Assessment Tool

A web app for completing Fire Risk Assessments with AI-powered photo analysis.

---

## Deploying to Railway (5 minutes)

### Step 1 — Get your Anthropic API key
1. Go to https://console.anthropic.com
2. Sign in or create an account
3. Go to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

### Step 2 — Put this folder on GitHub
1. Go to https://github.com and create a new repository (call it `fra-app`)
2. Upload all these files to it (drag and drop works)

### Step 3 — Deploy on Railway
1. Go to https://railway.app and sign in with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your `fra-app` repository
4. Railway will detect it's a Node.js app automatically

### Step 4 — Add your API key
1. In your Railway project, click **Variables**
2. Click **New Variable**
3. Name: `ANTHROPIC_API_KEY`
4. Value: paste your API key from Step 1
5. Click **Add**

### Step 5 — Open your app
1. Click **Settings** → **Networking** → **Generate Domain**
2. Railway gives you a URL like `fra-app-production.up.railway.app`
3. Open it — your FRA tool is live!

---

## How to use it

1. Fill in **Company details** (pre-filled with Energise Group)
2. Fill in **Property details** for the premises you surveyed
3. For each of the 7 survey sections:
   - Select a **status** (Satisfactory / Unsatisfactory / Requires Investigation / N/A)
   - **Upload photos** from your site visit (drag & drop or click to browse)
   - Click **Analyse photos with AI** — Claude will analyse the images and auto-fill the observations, recommended actions and timescale
   - Review and edit the AI-filled text as needed
4. Set the **Overall risk rating** and add **Priority actions**
5. Click **Generate Fire Risk Assessment Report**
   - Claude writes an AI executive summary from all your findings
   - A complete branded report is produced below
6. Click **Print / Save as PDF** to export

---

## Costs

- Railway free tier: $5 credit/month (enough for light use)
- Anthropic API: pay-per-use, roughly £0.01–0.05 per FRA depending on photo count

---

## Files

```
fra-app/
├── server.js          ← Node.js server (handles API calls to Claude)
├── package.json       ← Dependencies
├── .env.example       ← Copy to .env for local development
├── .gitignore
└── public/
    └── index.html     ← The full FRA form and report generator
```

---

## Running locally (optional)

```bash
cd fra-app
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
node server.js
# Open http://localhost:3000
```
