# Deploying this app — Frontend on Vercel, Backend on Render

## Why not put everything on Vercel?

Vercel's Python support is serverless functions: each request spins up a fresh, short-lived environment with an ephemeral filesystem. This app's backend is a normal always-on FastAPI/`uvicorn` server backed by a SQLite **file** (`bankapp.db`) — on Vercel that file would be wiped between requests, so accounts and applications wouldn't survive. Vercel is a great fit for the **Angular frontend** (it's just static files), so the split used here is:

- **Frontend (Angular)** → **Vercel**
- **Backend (FastAPI + SQLite)** → **Render** (a normal server host with a persistent process, so SQLite works the same way it does on your machine)

## Before you start

- Your code needs to be pushed to GitHub — both Vercel and Render deploy by connecting to a GitHub repo. This project is already at `https://github.com/SaranTrKS/BankApp`, so just make sure your latest changes are committed and pushed:
  ```
  git add -A
  git commit -m "Prepare for Vercel/Render deployment"
  git push
  ```
- You'll need a (free) [Render](https://render.com/) account and a (free) [Vercel](https://vercel.com/) account — both let you sign up with your GitHub account directly.

The setup has a chicken-and-egg ordering: the backend needs to know the frontend's URL (for CORS) and the frontend needs to know the backend's URL (to call the API), but neither URL exists until you deploy it once. So: **deploy the backend first**, note its URL, **then** deploy the frontend with that URL baked in.

---

## Step 1 — Deploy the backend (+ its database) to Render

`render.yaml` provisions **two** things together: a free Postgres database (`bankapp-db`) and the web service, with the database's connection string auto-wired into the web service as `DATABASE_URL`. This matters because Render's free *web service* instances have an ephemeral filesystem — anything written to disk (including a SQLite file) is wiped on every redeploy and whenever the free instance spins down from inactivity and wakes back up. A database is a separate resource with its own storage, so it isn't affected by the web service restarting.

`backend/database.py` already reads `DATABASE_URL` if it's set (falling back to the local SQLite file when it isn't, so nothing changes for local dev) and normalizes whichever URL style Render hands out. `psycopg2-binary` (the Postgres driver) is already in `requirements.txt`.

1. Go to the [Render dashboard](https://dashboard.render.com/) → **New +** → **Blueprint**.
2. Connect your GitHub account if you haven't, and select the `BankApp` repo. Render will detect `render.yaml` at the repo root and propose creating both `bankapp-db` (Postgres) and `bankapp-backend` (the web service).
3. Click through to create them. Render will run `pip install -r requirements.txt` (from the `backend/` folder — that's what `rootDir: backend` does) and start the service with `uvicorn main:app --host 0.0.0.0 --port $PORT`. On first startup, `Base.metadata.create_all()` + `run_migrations()` (already in `main.py`) create all the tables in the new, empty Postgres database automatically — no manual schema step needed.
4. Once it's deployed, Render shows you the web service's URL — something like `https://bankapp-backend.onrender.com`. **Copy this.**
5. Visit `https://bankapp-backend.onrender.com/health` — you should see `{"status":"ok"}`. If not, check the "Logs" tab for the error (a `psycopg2.OperationalError` there usually means the `DATABASE_URL` wiring didn't complete — check the web service's Environment tab shows a `DATABASE_URL` value pulled from `bankapp-db`).

**On Render's free Postgres retention policy:** free-tier terms on hosted databases change fairly often across providers, so double-check Render's current free Postgres page for how long a free database stays free/active before it needs upgrading. If Render's terms don't suit you, the same `DATABASE_URL` mechanism works with any other Postgres host — e.g. [Neon](https://neon.tech/) or [Supabase](https://supabase.com/) both have free tiers; just create a database there instead, copy its connection string, and set it as the `DATABASE_URL` environment variable on the Render web service manually instead of using the `fromDatabase` blueprint wiring.

**When the free Render database expires (it did, ~30 days in — Nov 2026):** the backend hangs on every request, because it connects to the database at startup. To start over with a new, empty free database: Render dashboard → `bankapp-db` → **Settings → Delete Database** (Render allows only one free Postgres per workspace, so the expired one has to go first). Then go to **Blueprints → this repo's blueprint → Manual Sync**. That recreates `bankapp-db` from `render.yaml` and points the web service's `DATABASE_URL` at it again. All accounts and applications start over, and this repeats every ~30 days. Upgrading `bankapp-db` to a paid plan, or moving to Neon/Supabase as described above, avoids that.

---

## Step 2 — Point the frontend at the backend

1. Open `frontend/src/environments/environment.prod.ts` and replace the placeholder with your real Render URL:
   ```ts
   export const environment = {
     production: true,
     apiBase: 'https://bankapp-backend.onrender.com',
   };
   ```
2. Commit and push:
   ```
   git add frontend/src/environments/environment.prod.ts
   git commit -m "Point production frontend at Render backend"
   git push
   ```

---

## Step 3 — Deploy the frontend to Vercel

1. Go to the [Vercel dashboard](https://vercel.com/new) → **Import Project** → select the `BankApp` GitHub repo.
2. Vercel will ask for the **Root Directory** — this matters since the repo has both `backend/` and `frontend/` in it. Set it to `frontend`.
3. Vercel should auto-detect the build settings from `frontend/vercel.json` (build command `npm run build`, output directory `dist/frontend/browser`). If it doesn't pick them up automatically, set them manually to match.
4. Click **Deploy**. Once it finishes, Vercel gives you a URL like `https://bankapp-xyz.vercel.app`. **Copy this too.**

---

## Step 4 — Close the loop: tell the backend about the frontend's URL

Now that you know the real Vercel URL:

1. **Render → CORS:** In the Render dashboard, open your `bankapp-backend` service → **Environment** tab → edit `ALLOWED_ORIGINS` and set it to your Vercel URL (no trailing slash), e.g. `https://bankapp-xyz.vercel.app`. Save — Render will redeploy automatically. Without this step, the browser will block every API call from the deployed frontend with a CORS error.

That's it for this step — unlike the Google/Firebase eras, email-OTP sign-in has no browser-side provider config at all (Brevo is called server-to-server from Render, not from the browser), so there's no equivalent "authorized domain" step to do here.

2. **Render → email sending:** While you're in that same Environment tab, add `BREVO_API_KEY` and `FROM_EMAIL` (and double-check `MANAGER_EMAILS` in `backend/manager_config.py` is what you want committed, or move it to an env var too if you'd rather not commit it) — see docs/auth-and-manager.md for how to get a Brevo API key and verify a sender address. Without these, every sign-in attempt will fail with a clear "not configured" error rather than crashing.

---

## Step 5 — Test it live

Visit your Vercel URL. Try signing in with an email address. If it's new, you'll fill in a short signup form first. If that email matches an entry in `backend/manager_config.py`'s `MANAGER_EMAILS`, you should land on `/manager` as soon as the OTP is verified.

**If something's wrong, check in this order:**
- Browser console shows a CORS error → `ALLOWED_ORIGINS` on Render doesn't match your exact Vercel URL yet (or hasn't redeployed).
- Sign-in fails with "Email sign-in isn't configured yet" → `BREVO_API_KEY`/`FROM_EMAIL` aren't set on the Render service yet (Step 4 above).
- The code never arrives by email → check Brevo's dashboard (Transactional → Email Activity) for whether the send actually succeeded; a common cause is `FROM_EMAIL` not yet being a verified sender in your Brevo account.
- API calls return `Failed to fetch` / network error → `environment.prod.ts`'s `apiBase` doesn't match your Render URL, or the Render service is asleep (free tier spins down after inactivity — the first request after a while can take 30-60 seconds to wake it back up).
- `/health` itself returns a 500, or Render's logs show a `psycopg2.OperationalError` → the web service's `DATABASE_URL` isn't pointing at a live Postgres instance yet — check the Environment tab on the web service.
- Manager dashboard doesn't load after a correct-looking sign-in → confirm the email you signed in with is exactly in `MANAGER_EMAILS` (case matters less since the backend lowercases it, but check for typos).

## Redeploying after future changes

Both Vercel and Render redeploy automatically on every push to your GitHub repo's default branch — just `git push` and both will pick up the change within a minute or two. No manual redeploy step needed once this initial setup is done.
