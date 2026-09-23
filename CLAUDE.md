# BankApp

Sample banking web app for **DCCB-VZM** (District Co-operative Central Bank, Vizianagaram, Andhra Pradesh). Three features: (1) a public-facing **deposit scheme calculator**, (2) a **loan application intake** form, (3) **Google Sign-In accounts + a dedicated bank-manager page** (`/manager`) that ties the two together. All three are implemented; Feature 3 was migrated from username/password to Google Sign-In on 2026-09-23 (see below) and needs a Google OAuth Client ID configured before login will actually work.

## Tech stack

- **Backend:** Python + FastAPI, SQLite (via SQLAlchemy), venv-managed. Auth is **Google Sign-In only** (`google-auth` verifies the ID token) + `python-jose` (our own session JWT, issued after Google verification).
- **Frontend:** Angular 22 (standalone components, no NgModules), SCSS
- **Charts:** Chart.js (frontend deposit calculator)

## Repo layout

```
BankApp/
  backend/
    main.py             FastAPI app: routes, CORS, run_migrations() on startup; POST /auth/google verifies the Google ID token and issues our JWT
    auth.py             Our own JWT creation/decoding (HTTPBearer), get_current_user/require_manager deps — no password logic anymore
    google_config.py    GOOGLE_CLIENT_ID + MANAGER_EMAILS — edit this file to configure Google Sign-In and assign managers by Gmail (see docs/auth-and-manager.md)
    database.py         SQLAlchemy engine/session (reads DATABASE_URL env var, falls back to local SQLite) + run_migrations() (non-destructive ALTER TABLE for new columns)
    models.py           User (incl. age, google_sub), LoanApplication, DepositApplication ORM models
    schemas.py          Pydantic request/response schemas, incl. CustomerSummary for the manager page
    requirements.txt
    venv/               (SQLite file bankapp.db lives here too, gitignored)
  frontend/
    src/app/
      app.ts / app.html / app.scss              Shell: DCCB-VZM header, green theme; renders account-page + <router-outlet>
      app.routes.ts                              '' -> HomePage, 'manager' -> ManagerDashboard (managerGuard), '**' -> ''
      app.config.ts                              provideHttpClient + authInterceptor, provideRouter(routes)
      environments/                              environment.ts (dev, localhost API) / environment.prod.ts (prod, real backend URL) — swapped via angular.json's fileReplacements on a production build; every service reads apiBase from here instead of hardcoding a URL
      vercel.json                                 Vercel build/output config + SPA rewrite so client-side routes don't 404 on refresh
      home-page/                                 Wraps deposit-schemes-page + loan-application-page; redirects a manager to /manager if they land here
      auth/
        models.ts, auth.service.ts, auth.interceptor.ts, manager.guard.ts, google-client-id.ts, google-identity.d.ts
        auth.service.ts re-verifies any localStorage-restored token via GET /auth/me before trusting it (verifying signal + whenReady() promise) — see docs/auth-and-manager.md
        account-page/                            "Sign in" dropdown: renders Google's own Sign-In button (no password form); shows sign-out when signed in; navigates by role after login
        complete-profile/                        One-time age/mobile form shown to a customer whose Google sign-in didn't include them (home-page swaps this in instead of the deposit/loan pages until saved)
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
    auth-and-manager.md     Auth design: Google Sign-In flow, manager-by-Gmail allowlist, profile completion, RBAC, security caveats
    deployment.md           How to deploy: frontend on Vercel, backend on Render, step-by-step
  README.md              Beginner-friendly install (git/Python/Node/Angular) + setup + run instructions
  render.yaml             Render Blueprint for the backend (see docs/deployment.md)
```

## Running locally

See **[README.md](README.md)** for full beginner-friendly instructions (installing Git/Python/Node/Angular from scratch, venv setup, etc). Quick reference once everything is installed:

Backend (Window 1):
```
cd backend
.\venv\Scripts\Activate
uvicorn main:app --reload
```
Runs at http://127.0.0.1:8000 and creates `bankapp.db` on first run. **Before login works, fill in `GOOGLE_CLIENT_ID` and `MANAGER_EMAILS` in `backend/google_config.py` and the matching Client ID in `frontend/src/app/auth/google-client-id.ts`** — see docs/auth-and-manager.md.

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

Summary: visitors sign in with **Google** (no password of ours, no separate registration form) — first-time sign-in auto-creates the account, and a first-time customer fills in age/mobile once via a one-time "complete your profile" step before they can apply for anything. Whether someone is a customer or a manager is decided by their Gmail address against `MANAGER_EMAILS` in `backend/google_config.py`, re-checked on every login. A manager lands on its own **routed page** (`/manager`, not a dropdown) listing **every registered customer**, with age and contact info, expandable per customer to see what they applied for (or a "no applications yet" note if nothing). Customers can never reach `/manager` (client-side guard + 403 server-side) and a manager can never see the customer pages (redirected back to `/manager` if they try).

**Changed 2026-09-23 (major):** migrated from username/password to **Google Sign-In only** — `/auth/register` and `/auth/login` are gone, replaced by `POST /auth/google` (verifies a Google ID token, auto-creates/looks-up the user, re-syncs role from `MANAGER_EMAILS`). Requires `GOOGLE_CLIENT_ID` set in both `backend/google_config.py` and `frontend/src/app/auth/google-client-id.ts` before it works — see docs/auth-and-manager.md for exactly how to get one and the full list of what changed.

**Changed 2026-09-23 (earlier same day):** `/manager/customers` no longer filters to customers with ≥1 application — it returns everyone with `role="customer"`. Dashboard stats now show both total registered customers and how many have actually applied.

**Recurring lesson (hit twice on 2026-09-23):** if a backend code change doesn't seem to take effect even though the edit is correct and the terminal logs a reload, check for a second orphaned `uvicorn`/`python` process still holding port 8000 (`Get-NetTCPConnection -LocalPort 8000` on Windows) before assuming the code is wrong — kill all of them and start one fresh instance.

Earlier password-auth-era fixes (CORS, inline validation, the `NG0203`/`NG0200` Angular DI pitfalls in the session-verification flow) are preserved in docs/auth-and-manager.md's history section — the specific forms/endpoints they mention no longer exist, but the lessons still apply.

## Deployment

Full step-by-step guide in **[docs/deployment.md](docs/deployment.md)**: frontend deploys to **Vercel**, backend deploys to **Render** (a normal always-on server — not a fit for Vercel's serverless functions). Data lives in a **Postgres** database (`render.yaml` provisions a free one and auto-wires `DATABASE_URL`), not SQLite — Render's free web service instances have an ephemeral filesystem that resets on redeploy/spin-down, so a local `.db` file wouldn't survive. `backend/database.py` reads `DATABASE_URL` when set and falls back to local SQLite otherwise, so nothing changes for local dev. `CORS`/`SECRET_KEY` are similarly env-var-overridable (`ALLOWED_ORIGINS`, `SECRET_KEY`); the frontend's backend URL is set via `frontend/src/environments/environment.prod.ts`, swapped in automatically on a production build.

## Conventions

- Keep scheme/rate data in a single config file (`frontend/src/app/deposit-schemes/deposit-schemes.data.ts`) — don't hardcode rates in components.
- Prefer standalone Angular components, no NgModules.
- Don't commit `backend/venv/`, `backend/*.db`, or `frontend/node_modules/` (already gitignored).
- Auth is Google Sign-In only — there is no password hashing in this app anymore. Don't reintroduce a username/password path without discussing it first.
- To make someone a manager, add their Gmail address to `MANAGER_EMAILS` in `backend/google_config.py` — never hardcode a manager account again.
- When adding a column to an existing model, add a corresponding step in `database.run_migrations()` (non-destructive `ALTER TABLE`) instead of deleting `bankapp.db` — the dev database may hold real test data worth keeping. Only delete it when you've confirmed (or the user confirms) it's disposable.
- **Update these docs at every checkpoint.** Whenever a feature/change reaches a working, verified state, update this file (structure, status, conventions) and the relevant file under `docs/` (spec, formulas, decisions, open items) as part of finishing the task — don't wait to be asked. The goal is for this repo to be self-contained context for any LLM or contributor picking it up cold.
