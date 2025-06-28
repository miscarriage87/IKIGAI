# IKIGAI X-ONE

Private, password-protected, **visually jaw-dropping** web application that guides **one single user** to their personal _Ikigai_ (生き甲斐) in ≤ 10 answers with GPT-4o-mini and a DALL-E 3 hero illustration.  
Designed as a 24 h birthday gift – speed over polish, but **wow factor mandatory**.

---

## ✨ Key Features

| Area | Highlights |
|------|------------|
| **AI Core** | • GPT-4o-mini prompts → compact Ikigai statement (DE) + 3 actionable weekly habits<br>• DALL-E 3 prompt → ultra-wide aurora “Ikigai vortex” hero image |
| **Visuals** | • Three.js + GLSL “Ikigai-Sphere” that glows with answer progress<br>• GSAP particle morph reveals “IKIGAI FOUND”<br>• Dark aurora gradient background, responsive, Lighthouse ≥ 90/95 |
| **Security** | HTTP Basic Auth (single user), creds from `.env` – no registration, no DB |
| **Simplicity** | Node 20 LTS + Express API ≤ 200 LOC, static HTML/vanilla JS, Tailwind CDN |
| **Persistence** | `data/sessions.json` + browser `localStorage` (instant caching / offline) |
| **Resilience** | OpenAI outage fallback (serve cached result), PM2 resurrect, daily JSON backup cron |
| **Deploy** | Turn-key on **PM2 + Nginx** (any Ubuntu 22.04 VPS) **or** 1-click serverless on **Vercel** |

---

## 🚀 Quick Start (Local Dev)

1. **Clone & install**

   ```bash
   git clone https://github.com/miscarriage87/IKIGAI.git
   cd IKIGAI
   npm install
   ```

2. **Create `.env`**

   ```bash
   cp .env.example .env
   # fill in OPENAI_API_KEY, AUTH_USERNAME, AUTH_PASSWORD, SESSION_SECRET …
   ```

3. **Run dev server**

   ```bash
   npm run dev   # nodemon watching /server and static /public
   ```

   Visit `http://localhost:3000` – authentication is skipped in `NODE_ENV=development`.

---

## 🗄️ Project Structure

```
ikigai-x-one/
├── server/            # Express API (api.js)
├── public/            # Static SPA (index.html, app.js, shaders …)
├── data/              # sessions.json + backups/
├── deploy/            # Nginx, PM2, deploy.sh
├── .env.example
└── README.md
```

---

## ⚙️ Environment Variables

| Var | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | Your OpenAI secret key |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | HTTP Basic Auth credentials |
| `SESSION_SECRET` | Any random string for cookie signing (future-proof) |
| `OPENAI_MODEL` | Defaults to `gpt-4o-mini` |
| `OPENAI_IMAGE_MODEL` / `OPENAI_IMAGE_SIZE` | DALL-E 3 settings |
| `PORT` / `HOST` | Server binding (default 3000 / 0.0.0.0) |
| `DATA_PATH` | Persistence file (`./data/sessions.json`) |

---

## 📡 API Reference

### `POST /api/ikigai`

Generate Ikigai from ≤ 10 answers.

| Body (JSON) | Type | Description |
|-------------|------|-------------|
| `answers` | `[{ question, answer, category }]` | Array from questionnaire |
| `sessionId` | `string` (optional) | Client-generated ID (fallback: timestamp) |

**Response** – _Server Sent Events_ (`text/event-stream`):

```
event: processing   data: {"message":"Analyzing your answers..."}
event: ikigai       data: {"ikigai":"…","actions":["…","…","…"]}
event: image        data: {"url":"https://…"}
event: complete     data: {"sessionId":"1709123456789"}
```

### `GET /api/session/:id`

Returns cached session `{ id, timestamp, answers, result, imageUrl }` or **404**.

---

## 🖥️ Production Deployment

### Option A – VPS (Ubuntu 22.04) with PM2 + Nginx

1. **Copy repo & install**

   ```bash
   ssh <user>@<server>
   sudo apt update && sudo apt install -y git nodejs npm nginx
   git clone https://github.com/miscarriage87/IKIGAI.git
   cd IKIGAI && npm ci
   ```

2. **Env & start**

   ```bash
   cp .env.example .env   # edit credentials & OpenAI key
   npx pm2 start server/api.js --name ikigai
   npx pm2 save           # auto-resurrect on reboot
   ```

3. **TLS reverse-proxy**

   ```
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/ikigai
   sudo ln -s /etc/nginx/sites-available/ikigai /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl restart nginx
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d ikigai.example.com
   ```

4. **Daily backups**

   ```
   echo "0 3 * * * cd /home/<user>/IKIGAI && ./deploy/backup.sh" | crontab -
   ```

### Option B – Vercel (Zero-Ops)

1. `vercel init` → **Framework: Other**  
2. Set env vars in Vercel dashboard (`OPENAI_API_KEY`, credentials …)  
3. `vercel --prod` – Vercel’s serverless functions automatically serve `/api/*`.

_No Nginx / PM2 needed. Basic Auth handled in Lambda per request._

---

## 🏎️ Performance & Quality Targets

| Metric | Threshold |
|--------|-----------|
| Lighthouse **Performance** | ≥ 90 mobile / desktop |
| **Accessibility** | ≥ 95 |
| First Contentful Paint | ≤ 2 s |
| Total Blocking Time | ≤ 250 ms |

Run locally:

```bash
npx lighthouse http://localhost:3000 --view
```

---

## 🔒 Security & Backups

- **HTTP Basic Auth** protects entire site (single user).
- Sessions persisted to `data/sessions.json`; app reads cached result if OpenAI is down.
- `deploy/backup.sh` copies JSON to timestamped files under `data/backups/`.
- PM2 `--no-autorestart false` guarantees restart on crash; `pm2 save` persists across reboots.
- Keep `AUTH_PASSWORD`, `SESSION_SECRET`, and `OPENAI_API_KEY` secret – never commit `.env`.

---

## 🛠️ One-Command Redeploy

```bash
ssh <user>@<server> "cd IKIGAI && git pull && npm ci && pm2 restart ikigai"
```

For password rotation, edit `.env`, `pm2 restart ikigai`.

---

## 🤝 Credits

Crafted with ❤️ by autonomous agents (Builder, UI, Prompter, Tester, Deployer) in Factory.  
Three.js, GSAP, Tailwind CSS, OpenAI, and aurora lights inspiration by the North.

Happy birthday – möge dein _Ikigai_ dich leiten!
