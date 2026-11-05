# BankApp

Sample banking web app for **DCCB-VZM** (District Co-operative Central Bank, Vizianagaram, Andhra Pradesh). Three features: (1) a public-facing **deposit scheme calculator**, (2) a **loan application intake** form, (3) **email-OTP accounts + a dedicated bank-manager page** (`/manager`) that ties the two together. All three are implemented; Feature 3's login mechanism has changed three times (password → Google Sign-In on 2026-09-23 → phone OTP via Firebase on 2026-11-03 → email OTP via Brevo on 2026-11-05, see below) and needs a Brevo account configured before login will actually work.

**Status (2026-11-05): all three features are deployed and working live** — frontend on Vercel, backend + Postgres on Render, OTP emails delivered via Brevo (verified end-to-end in production). See **Live deployment** below before touching anything deployment-related.

## Tech stack

- **Backend:** Python + FastAPI, SQLite or Postgres (via SQLAlchemy), venv-managed. Auth is **email + OTP only** — the backend generates/hashes/emails the code itself (via Brevo's HTTP API, `backend/email_service.py`) rather than delegating to a third-party auth SDK + `python-jose` (our own session JWT, issued after OTP verification).
- **Frontend:** Angular 22 (standalone components, no NgModules), SCSS
- **Charts:** Chart.js (frontend deposit calculator)

## Repo layout

```
BankApp/
  backend/
    main.py             FastAPI app: routes, CORS, run_migrations() on startup; POST /auth/signup, /auth/request-otp, /auth/verify-otp issue/check the email OTP and our JWT
    auth.py             Our own JWT creation/decoding (HTTPBearer), get_current_user/require_manager deps — no password logic anymore
    email_service.py    send_otp_email() — posts to Brevo's transactional-email API (requests, no SDK); logs Brevo's error body ("Brevo rejected the send (401): ...") so failures are diagnosable from Render's logs
    manager_config.py   BREVO_API_KEY (read from the BREVO_API_KEY env var — never hardcoded) + FROM_EMAIL + FROM_NAME + MANAGER_EMAILS — edit this file to configure email sign-in and assign managers (see docs/auth-and-manager.md)
    database.py         SQLAlchemy engine/session (reads DATABASE_URL env var, falls back to local SQLite) + run_migrations() (non-destructive ALTER TABLE for new columns)
    models.py           User (incl. age, mobile, email [unique, the login identity], email_verified, otp_hash/otp_expires_at/otp_attempts, pending_full_name/pending_age/pending_mobile), LoanApplication, DepositApplication ORM models
    schemas.py          Pydantic request/response schemas, incl. CustomerSummary for the manager page
    requirements.txt
    venv/               (gitignored; local dev SQLite file is backend/bankapp.db, also gitignored)
  frontend/
    vercel.json                                  Vercel build/output config + SPA rewrite so client-side routes don't 404 on refresh
    src/app/
      app.ts / app.html / app.scss              Shell: DCCB-VZM header, green theme; renders account-page + <router-outlet>
      app.routes.ts                              '' -> HomePage, 'manager' -> ManagerDashboard (managerGuard), '**' -> ''
      app.config.ts                              provideHttpClient + authInterceptor, provideRouter(routes)
      environments/                              environment.ts (dev, localhost API) / environment.prod.ts (prod, real backend URL) — swapped via angular.json's fileReplacements on a production build; every service reads apiBase from here instead of hardcoding a URL
      home-page/                                 Wraps deposit-schemes-page + loan-application-page; redirects a manager to /manager if they land here
      auth/
        models.ts, auth.service.ts, auth.interceptor.ts, manager.guard.ts
        auth.service.ts re-verifies any localStorage-restored token via GET /auth/me before trusting it (verifying signal + whenReady() promise) — see docs/auth-and-manager.md
        account-page/                            "Sign in" dropdown: three-step email -> (signup if new) -> OTP form; no third-party SDK (OTP is emailed by the backend via Brevo); shows sign-out when signed in; navigates by role after login
      deposit-schemes/
        models.ts                                DepositScheme / RateSlab / CustomerType types
        calculators.ts                            FD/RD/doubling/flat-interest formulas + buildBalaBhavishyathStages
        deposit-schemes.data.ts                   8 standard scheme configs (source of truth for rates)
        deposit-application.service.ts            POST/GET for "apply for this deposit"
        chart-line/                               Chart.js line-chart wrapper (standard scheme cards)
        stage-bar-chart/                          Chart.js grouped bar-chart wrapper (Investment vs Maturity per stage)
        scheme-card/                              Customer-type toggle + tenure slider (ladder only) + line chart + maturity value + Apply button; amount comes in via [globalAmount], clamped to the scheme's own range
        bala-bhavishyath-card/                    Dedicated card for the 21yr/3-stage children's scheme (not in DEPOSIT_SCHEMES — doesn't fit the shared model); amount also comes in via [globalAmount], clamped to its 1,000-10,000 installment range
        deposit-schemes-page/                     "Deposit Schemes" dropdown: one shared "Deposit Amount" field feeding every card, the standard grid, and the Bala Bhavishyath section below it
      loan-application/
        models.ts, loan-application.service.ts
        loan-application-page/                    "Apply for a Loan" dropdown + form (login-gated)
      manager/
        models.ts, manager.service.ts             CustomerSummary types + GET /manager/customers
        manager-dashboard/                        Routed page at /manager (not a dropdown): customer table (age, mobile, email, counts), expandable per-row to that customer's loan + deposit applications
  docs/
    deposit-schemes.md      Deposit calculator spec: extracted rates, formulas, calc-type decisions, apply-flow
    loan-applications.md    Loan scheme research (DCCB sites), loan form spec, implementation status
    auth-and-manager.md     Auth design: email-OTP (Brevo) flow, signup-then-verify ordering, manager-by-email allowlist, RBAC, security caveats
    deployment.md           How to deploy: frontend on Vercel, backend on Render, step-by-step
    branches.md             Reference data: DCCB-VZM's 25 branches (name, code, email), transcribed from Documents/*.png. Not used by any feature yet
  Documents/                Source scans: braches_1.png, branches_2.png (branch list)
  README.md              Beginner-friendly install (git/Python/Node/Angular) + setup + run instructions
  render.yaml             Render Blueprint: bankapp-db (free Postgres) + bankapp-backend web service and its env vars (see docs/deployment.md)
```

## Running locally

See **[README.md](README.md)** for full beginner-friendly instructions (installing Git/Python/Node/Angular from scratch, venv setup, etc). Quick reference once everything is installed:

Backend (Window 1):
```
cd backend
.\venv\Scripts\Activate
uvicorn main:app --reload
```
Runs at http://127.0.0.1:8000 and creates `bankapp.db` on first run. For email sign-in locally, set the key in the same window *before* starting uvicorn: `$env:BREVO_API_KEY="xkeysib-..."`. **Before login works, create a free Brevo account, then set the `BREVO_API_KEY` environment variable and fill in `FROM_EMAIL` and `MANAGER_EMAILS` in `backend/manager_config.py`** (never commit the API key — GitHub push protection blocks it) — see docs/auth-and-manager.md. (No frontend config needed this time — the API key must stay backend-only.)

Frontend (Window 2):
```
cd frontend
ng serve
```
Runs at http://127.0.0.1:4200

## Feature 1: Deposit scheme calculator

Full spec, extracted interest-rate tables, and calculation formulas live in **[docs/deposit-schemes.md](docs/deposit-schemes.md)**.

Key decisions: quarterly compounding for all FD-type products; Double Plus Deposit is a fixed ~8y8m "doubling" product; green theme based on the DCCB-VZM logo. Each card also has an **Apply for this Deposit** button (login required) that records the submission — see Feature 3.

**Changed 2026-09-23:** replaced each card's own amount slider with a single "Deposit Amount" field at the top of the page (`deposit-schemes-page`), passed as `[globalAmount]` to every card. Each card clamps that shared value into its own valid range (e.g. SPL RD and Bala Bhavishyath cap it to their much smaller installment ranges) and shows a note when it does. The FD ladder card keeps its own tenure slider — only the amount control was unified. See docs/deposit-schemes.md for details.

## Feature 2: Loan applications

Full spec, research on real DCCB loan categories, and implementation status live in **[docs/loan-applications.md](docs/loan-applications.md)**. No real Vizianagaram rate data is published anywhere, so this is an intake form only (no rate calculation). Submitting requires login.

## Feature 3: Accounts, applications, and the manager page

Full design lives in **[docs/auth-and-manager.md](docs/auth-and-manager.md)**.

Summary: visitors sign in with **any email address + a one-time code** (no password, no third-party account, Gmail-only no longer required) — a new email signs up first (name/age/mobile) and *then* verifies; a returning email just verifies. Whether someone is a customer or a manager is decided by their email against `MANAGER_EMAILS` in `backend/manager_config.py`, re-checked on every verification. A manager lands on its own **routed page** (`/manager`, not a dropdown) listing **every registered customer**, with age and contact info, expandable per customer to see what they applied for (or a "no applications yet" note if nothing). Customers can never reach `/manager` (client-side guard + 403 server-side) and a manager can never see the customer pages (redirected back to `/manager` if they try).

**Changed 2026-11-05 (major):** migrated from Firebase phone OTP to **email OTP via Brevo** — `/auth/firebase` and `/auth/complete-profile` are gone, replaced by `POST /auth/signup`, `POST /auth/request-otp`, `POST /auth/verify-otp`. The backend now generates/hashes/emails the code itself instead of delegating to a third-party SDK. A real bug was caught and fixed during this migration: a naive "overwrite an unverified row on signup retry" rule would have let anyone overwrite an existing account's profile just by knowing its email, since the new `email_verified` column defaults to `False` for every pre-existing row — fixed by staging signup data in `pending_*` columns that only become real once the OTP is actually verified. See docs/auth-and-manager.md for the full writeup, including a real production account's data that got corrupted by this bug before the fix (still pending restoration from the user).

**Changed 2026-11-03 (major, now superseded above):** migrated from Google Sign-In to phone OTP via Firebase. Kept for history in docs/auth-and-manager.md.

**Changed 2026-09-23 (major, now superseded above):** migrated from username/password to Google Sign-In only. Kept for history in docs/auth-and-manager.md.

**Changed 2026-09-23 (earlier, still current):** `/manager/customers` no longer filters to customers with ≥1 application — it returns everyone with `role="customer"`. Dashboard stats show both total registered customers and how many have actually applied.

**Recurring lesson (hit repeatedly across every migration in this app, including twice during the email-OTP one):** if a backend code change doesn't seem to take effect even though the edit is correct and the terminal logs a reload, check for a second orphaned `uvicorn`/`python` process still holding port 8000 (`Get-NetTCPConnection -LocalPort 8000` on Windows) before assuming the code is wrong — kill all of them and start one fresh instance.

Earlier password-auth-era fixes (CORS, inline validation, the `NG0203`/`NG0200` Angular DI pitfalls in the session-verification flow) are preserved in docs/auth-and-manager.md's history section — the specific forms/endpoints they mention no longer exist, but the lessons still apply.

## Deployment

Full step-by-step guide in **[docs/deployment.md](docs/deployment.md)**: frontend deploys to **Vercel**, backend deploys to **Render** (a normal always-on server — not a fit for Vercel's serverless functions). Data lives in a **Postgres** database (`render.yaml` provisions a free one and auto-wires `DATABASE_URL`), not SQLite — Render's free web service instances have an ephemeral filesystem that resets on redeploy/spin-down, so a local `.db` file wouldn't survive. `backend/database.py` reads `DATABASE_URL` when set and falls back to local SQLite otherwise, so nothing changes for local dev. `CORS`/`SECRET_KEY` are similarly env-var-overridable (`ALLOWED_ORIGINS`, `SECRET_KEY`); the frontend's backend URL is set via `frontend/src/environments/environment.prod.ts`, swapped in automatically on a production build.

## Live deployment (as of 2026-11-05)

| Piece | Where | Notes |
|---|---|---|
| Code | GitHub `SaranTrKS/BankApp`, branch `main` | Every push to `main` auto-redeploys both Vercel and Render. |
| Frontend | Vercel, root directory `frontend/` → **`https://dccb-vzm-bank.vercel.app`** (stable domain, added 2026-11-05 under the project's Settings → Domains) | Static Angular build. **Has no env vars and needs none** — never put secrets here (anything in the frontend ships to every browser). Calls the backend at the URL in `frontend/src/environments/environment.prod.ts`. |
| Backend | Render web service `bankapp-backend` → `https://bankapp-backend-nboo.onrender.com` | Python 3.14 on Render, `rootDir: backend`. Free tier: sleeps when idle, first request can take 30-60s. `/health` returns `{"status":"ok"}`. |
| Database | Render Postgres `bankapp-db` (free) | Wired into the backend as `DATABASE_URL` by the Blueprint. **Recreated empty on 2026-11-05** after the first free DB expired; **expect it to expire again ~2026-12-05.** Recovery steps in docs/deployment.md. |
| Email | Brevo transactional API | Sender `FROM_EMAIL` in `manager_config.py`. |

**Backend env vars (all set on Render → `bankapp-backend` → Environment):**
- `DATABASE_URL` — auto-wired from `bankapp-db` by `render.yaml`.
- `SECRET_KEY` — auto-generated by `render.yaml` (`generateValue: true`); signs our JWTs.
- `ALLOWED_ORIGINS` — the exact Vercel URL(s), comma-separated, no trailing slash. Must include `https://dccb-vzm-bank.vercel.app`, the stable domain. Per-deploy URLs like `https://bank-1iu6xk9vu-bank-app4.vercel.app` (`<project>-<hash>-<team>.vercel.app`) change between deploys, so don't rely on them. If you rename the Vercel domain, update `ALLOWED_ORIGINS` too, or the browser gets CORS errors. `sync: false` in `render.yaml`, so it's set only in the dashboard.
- `BREVO_API_KEY` — Brevo **API key** (starts `xkeysib-`). `sync: false`, dashboard only.

**Hard-won deployment lessons (all hit on 2026-11-05):**
- **Never commit a secret.** A hardcoded Brevo key got the push rejected by GitHub push protection (GH013). Fix was moving it to an env var and rewriting the *unpushed* commits (`git reset --soft <last-pushed-commit>` + recommit) — adding a new "remove key" commit on top does **not** work, because GitHub scans every pushed commit. Never use GitHub's "allow secret" link.
- **Brevo has two kinds of key.** `xsmtpsib-...` is an *SMTP* key (SMTP & API → SMTP tab) and does **not** work with the HTTP API this app uses — Brevo answers `401 {"message":"Key not found"}`. Use an *API* key, `xkeysib-...` (SMTP & API → **API Keys** tab).
- **Render's free Postgres expires after ~30 days.** The backend connects at import time (`Base.metadata.create_all` in `main.py`), so a dead DB makes the whole service hang/crash on startup (`could not translate host name "dpg-..."` in the logs, service marked "Failed").
- **A Blueprint "Manual Sync" re-applies every value in `render.yaml`.** It once reset `ALLOWED_ORIGINS` to a placeholder, which showed up as `OPTIONS /auth/... 400 Bad Request` (CORS preflight rejected). That's why `ALLOWED_ORIGINS` and `BREVO_API_KEY` are now `sync: false`.
- **Reading Render logs:** `OPTIONS ... 400` → CORS / `ALLOWED_ORIGINS`. `POST /auth/request-otp 404` → no account for that email (normal; frontend switches to signup). `POST /auth/signup` or `/auth/request-otp` `502` → Brevo refused the send; the `ERROR: Brevo rejected the send (...)` line just above it says why. `500 "Email sign-in isn't configured yet"` → `BREVO_API_KEY` unset.

## Conventions

- **Secrets go in environment variables, never in committed files** (`BREVO_API_KEY`, `SECRET_KEY`, `DATABASE_URL`). Locally set them in the terminal before `uvicorn`; in production set them on Render. Nothing secret ever goes in the frontend or on Vercel.

- Keep scheme/rate data in a single config file (`frontend/src/app/deposit-schemes/deposit-schemes.data.ts`) — don't hardcode rates in components.
- Prefer standalone Angular components, no NgModules.
- Don't commit `backend/venv/`, `backend/*.db`, or `frontend/node_modules/` (already gitignored).
- Auth is email-OTP only (sent via Brevo) — there is no password hashing in this app anymore. Don't reintroduce a username/password path without discussing it first.
- To make someone a manager, add their email to `MANAGER_EMAILS` in `backend/manager_config.py` — never hardcode a manager account again.
- Never add a boolean "verified"/"confirmed"-style column without considering what its default means for every pre-existing row — see the signup-overwrite bug in docs/auth-and-manager.md for what goes wrong when it's assumed to mean "never happened" instead of "column didn't exist yet."
- When adding a column to an existing model, add a corresponding step in `database.run_migrations()` (non-destructive `ALTER TABLE`) instead of deleting `bankapp.db` — the dev database may hold real test data worth keeping. Only delete it when you've confirmed (or the user confirms) it's disposable.
- **Update these docs at every checkpoint.** Whenever a feature/change reaches a working, verified state, update this file (structure, status, conventions) and the relevant file under `docs/` (spec, formulas, decisions, open items) as part of finishing the task — don't wait to be asked. The goal is for this repo to be self-contained context for any LLM or contributor picking it up cold.
