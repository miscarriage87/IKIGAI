# IKIGAI X-ONE – Architecture Overview

Private, single-user web experience that discovers an individual’s **Ikigai** through ten questions, GPT-4o-mini reasoning, and a DALL-E 3 hero image.  
Optimised for 24-hour build speed, low-ops hosting, and *visual wow*.

---

## 1. High-Level View

```
┌────────────┐   HTTPS    ┌────────────────────┐   OpenAI REST   ┌───────────────┐
│  Browser    │◄────────►│  Express API (Node) │◄───────────────►│ OpenAI APIs   │
│  SPA + 3D   │  SSE/JSON │  server/api.js     │  JSON & SSE     │ Chat + Images │
└────┬────────┘           └────────┬───────────┘                 └───────────────┘
     │  Static files              │  JSON file I/O
     ▼                            ▼
┌────────────┐             ┌────────────────┐
│  /public   │  <──────────│ data/sessions.json │
└────────────┘   (local FS)└────────────────┘
```

Deployment target  
• **Vercel (serverless) _or_ PM2 + Nginx on VPS** – both serve same code without changes.

---

## 2. Key Components

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Client SPA | Static HTML, Vanilla JS, **Tailwind CDN**, **Three.js**, **GSAP** | Questionnaire UI, 3-D Ikigai-Sphere shader, progress logic, SSE handling, localStorage caching, animations |
| REST/SSE API | **Express 4** (`server/api.js`, ≤200 LOC) | HTTP Basic Auth, input validation, OpenAI calls, streaming results (text + image) as **Server-Sent Events**, JSON persistence |
| AI Integration | **OpenAI Node SDK** | `chat.completions` → Ikigai JSON, `images.generate` → hero image URL |
| Persistence | **data/sessions.json** (fs) + client `localStorage` | Server-side history (for fallback / backups), instant client cache |
| Auth | HTTP Basic (built-in Express, credentials from `.env`) | Guarantees single-user access without extra UI |
| 3-D Engine | Three.js + custom GLSL | Animated “Ikigai-Sphere” whose `progress` uniform lights up as answers are filled |
| Build/Deploy | npm scripts, **vercel.json** for serverless, **PM2** config + `deploy/**/*.sh` for VPS | One-command local dev (`npm run dev`) & push-to-deploy on Vercel; cron backup, TLS auto-renew on VPS |

---

## 3. Data Flow Walk-Through

### 3.1 Questionnaire → Ikigai Result

1. **User answers** each question (`answers[]`).
2. On **“Abschließen”** the client POSTs `/api/ikigai` with `{answers, sessionId}`.
3. Server:
   1. Writes provisional session to `sessions.json`.
   2. Streams `event: processing` SSE to client.
   3. Calls `chat.completions` with a strict JSON-only prompt (German).
   4. Streams `event: ikigai` with parsed `{ikigai, actions}`.
   5. Generates DALL-E 3 image → `event: image` with URL.
   6. Final `event: complete` → client closes connection.
4. Client stores `ikigaiResult` + `ikigaiImage` + `sessionId` in `localStorage`.
5. Animations trigger: sphere glow to 100 %, particle text “IKIGAI GEFUNDEN”, hero image fade-in.

### 3.2 Subsequent Visits / OpenAI Outage

- On load: SPA checks `localStorage`; if present, bypasses questionnaire and renders cached result instantly.  
- Server `/api/session/:id` can return history for backup restore.

---

## 4. Technical Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Static SPA + tiny API** | Keeps server code minimal; hot deploy to serverless platforms. |
| **Server-Sent Events** | Simple push channel vs. WebSocket; supported by Vercel functions. |
| **JSON file persistence** | Meets single-user scope, no external DB, easy to back up. |
| **HTTP Basic Auth** | Zero UI overhead, standard browser prompt, single credential pair. |
| **Three.js & GLSL** | Delivers mandatory “visual jaw-drop” with minimal dependencies. |
| **Tailwind via CDN** | No build step, instant styling palette. |
| **Vercel default** | Free TLS, CDN, zero-ops, <5 min deploy; PM2 script retains VPS option. |
| **German-only prompts** | Gift recipient language, ensures GPT responses need no further localisation. |

**Trade-offs**

- No multi-tenant user handling → cannot scale beyond one credential pair (meets spec).  
- File persistence limits concurrent writes; acceptable for single client.  
- DALL-E image URL not cached offline (link expires after 24h) – acceptable for gift scenario.

---

## 5. Non-Functional Guarantees

| Aspect | Approach |
|--------|----------|
| **Performance** | Fully static assets, lazy JS, Three.js render budget <3 ms/frame; Lighthouse ≥ 90. |
| **Security** | HTTPS everywhere (Vercel / LetsEncrypt), `helmet`, CSP disabled only for inline shaders. |
| **Resilience** | PM2 resurrect, cron `backup.sh`; client offline cache; graceful SSE error events. |
| **Accessibility** | Tailwind focus states, semantic HTML, contrast-checked colours. |
| **Maintainability** | Clear repo tree, ESLint, <2 KLOC total, docs (`README`, `DEPLOYMENT`, this file). |

---

## 6. Extensibility Notes

- **Multi-user**: swap Basic Auth for JWT + lightweight DB (SQLite); reuse same API shape.  
- **Analytics**: inject PostHog/Simple-Analytics script; CSP allowlist.  
- **Translations**: externalise strings in `/public/ui-tokens.json`; prompt language switch.

---

## 7. Sequence Diagram (textual)

```
Browser          Express API              OpenAI
   |                  |                     |
   |---POST /ikigai-->|                     |
   |                  |--chat.completions-->| 
   |                  |<-Ikigai JSON--------| 
   |<--SSE ikigai-----|                     |
   |                  |--images.generate--->| 
   |                  |<-Image URL----------|
   |<--SSE image------|                     |
   |<--SSE complete---|                     |
```

---

*Prepared by autonomous Factory agents — Builder, UI, Prompter, Tester, Deployer — under the 24-hour birthday sprint.*  
