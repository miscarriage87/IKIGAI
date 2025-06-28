# SECURITY NOTES

_This project is a one-off **birthday gift** meant for a single, trusted audience.  
The measures below explain which shortcuts were taken for speed and how to harden the app for any broader or longer-term use._

---

## 1. Hard-coded User Accounts

| Email                              | Password        | Purpose                    |
|------------------------------------|-----------------|----------------------------|
| juergen.pohl@mac.com               | jocop           | demo / gift only           |
| carola.pohl@mac.com                | rollyp          | demo / gift only           |
| christoph.pohl@mac.com             | chrisleep       | demo / gift only           |
| ben.pohl@icloud.com                | beninatorp      | demo / gift only           |
| silvana.schober83@gmail.com        | schmuseschmuiiip| demo / gift only           |

* **Location**: `server/api.js` – `const USERS = { … }`
* **Why**: Allows immediate access for five family members without UI or DB overhead.
* **Production Advice**
  1. **Delete** the `USERS` object (or move to a secret store).
  2. Keep **one** credential pair in `.env` (`AUTH_USERNAME`, `AUTH_PASSWORD`) **or** switch to a proper auth layer (JWT, OAuth, etc.).
  3. Enforce strong, unique passwords and rotate them regularly.

---

## 2. OpenAI API Key

* **Never** commit any key to Git, public or private.
* The key belongs in the local `.env` or—in cloud scenarios—your platform’s **secret manager**:
  * **Vercel** → Project → *Settings → Environment Variables*
  * **Render / Railway / Netlify** → Environment settings
* Rotate the key immediately if it ever leaks (`View → Regenerate key` in the OpenAI dashboard).

---

## 3. Environment Variable Hygiene

| Variable            | Scope            | Notes                                   |
|---------------------|------------------|-----------------------------------------|
| `OPENAI_API_KEY`    | **secret**       | Required for all GPT / DALL-E calls     |
| `SESSION_SECRET`    | **secret**       | Random 32+ chars; used for future JWT   |
| `AUTH_USERNAME/PASSWORD` | **secret** | Browser basic-auth credentials          |
| `DATA_PATH`         | non-secret       | Can stay in repo (`./data/sessions.json`)|

**.env** is in `.gitignore`; keep it that way.  
For CI/CD, inject variables at build / deploy time.

---

## 4. Deployment Best Practices

1. **HTTPS Only**  
   • Vercel / Netlify / Render provide free TLS.  
   • If self-hosting, use Let’s Encrypt via Nginx or Caddy.

2. **Minimal Attack Surface**  
   * Open port **443** (HTTPS) and **22** (SSH) only.  
   * Disable root SSH login; use key-based auth.

3. **Process Management**  
   * Run with **PM2** (`--no-autorestart false`) so crashes auto-recover.  
   * `pm2 save` after every config change.

4. **Backups**  
   * `deploy/backup.sh` makes daily, timestamped gzip copies of `data/sessions.json`.  
   * Store backups off-box or sync to S3 / Dropbox.

5. **Dependency Updates**  
   * Audit weekly: `npm audit --production`.  
   * Stick to the current LTS (Node 20) for security patches.

6. **Logging & Monitoring**  
   * Enable PM2 “logs” or pipe to Papertrail / Logtail for real-time alerts.  
   * Monitor 5xx rates; any spike may indicate abuse or key exhaustion.

---

## 5. Key Rotation & Incident Response

| Scenario                          | Immediate Action                                   |
|-----------------------------------|----------------------------------------------------|
| OpenAI key leak                   | Revoke & regenerate key → update secret manager    |
| Password compromise               | Change `.env` creds or remove user from `USERS`    |
| Data corruption                   | Restore last `data/backups/sessions_*.json.gz`     |
| Server breach                     | Rebuild server, restore code & backups, rotate keys|

Always keep **offline copies** of critical secrets and backups.

---

## 6. Removing the Gift Shortcuts

Before re-using this code base for anything public:

1. Delete the **hard-coded user list**.  
2. Replace Basic Auth with a standards-based auth flow.  
3. Move persistence from flat JSON to a proper database (SQLite, Postgres, etc.).  
4. Review all TODO / FIXME comments and implement missing security headers (CSP, HSTS).

---

_Enjoy the gift – and stay safe!_
