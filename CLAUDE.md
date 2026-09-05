# BankApp

Sample banking web app for **DCCB-VZM** (District Co-operative Central Bank, Vizianagaram, Andhra Pradesh). Three features: (1) a public-facing **deposit scheme calculator**, (2) a **loan application intake** form, (3) **user accounts + a dedicated bank-manager page** (`/manager`) that ties the two together. All three are implemented and verified as of 2026-09-05.

## Tech stack

- **Backend:** Python + FastAPI, SQLite (via SQLAlchemy), venv-managed. Auth via `bcrypt` (password hashing) + `python-jose` (JWT).
- **Frontend:** Angular 22 (standalone components, no NgModules), SCSS
- **Charts:** Chart.js (frontend deposit calculator)

## Repo layout

```
BankApp/
  backend/
    main.py             FastAPI app: routes, CORS, manager-account seeding + run_migrations() on startup
    auth.py             Password hashing (bcrypt directly — see docs/auth-and-manager.md), JWT, get_current_user/require_manager deps
    database.py         SQLAlchemy engine/session + run_migrations() (non-destructive ALTER TABLE for new columns)
    models.py           User (incl. age), LoanApplication, DepositApplication ORM models
    schemas.py          Pydantic request/response schemas, incl. CustomerSummary for the manager page
    requirements.txt
    venv/               (SQLite file bankapp.db lives here too, gitignored)
  frontend/
    src/app/
      app.ts / app.html / app.scss              Shell: DCCB-VZM header, green theme; renders account-page + <router-outlet>
      app.routes.ts                              '' -> HomePage, 'manager' -> ManagerDashboard (managerGuard), '**' -> ''
      app.config.ts                              provideHttpClient + authInterceptor, provideRouter(routes)
      home-page/                                 Wraps deposit-schemes-page + loan-application-page; redirects a manager to /manager if they land here
      auth/
        models.ts, auth.service.ts, auth.interceptor.ts, manager.guard.ts
        account-page/                            "Login / Register" dropdown (tabs incl. Age field; shows logout when signed in; navigates by role after login)
      deposit-schemes/
        models.ts                                DepositScheme / RateSlab / CustomerType types
        calculators.ts                            FD/RD/doubling/flat-interest formulas + buildBalaBhavishyathStages
        deposit-schemes.data.ts                   8 standard scheme configs (source of truth for rates)
        deposit-application.service.ts            POST/GET for "apply for this deposit"
        chart-line/                               Chart.js line-chart wrapper (standard scheme cards)
        stage-bar-chart/                          Chart.js grouped bar-chart wrapper (Investment vs Maturity per stage)
        scheme-card/                              Slider + customer-type toggle + line chart + maturity value + Apply button
        bala-bhavishyath-card/                    Dedicated card for the 21yr/3-stage children's scheme (not in DEPOSIT_SCHEMES — doesn't fit the shared model)
        deposit-schemes-page/                     "Deposit Schemes" dropdown: standard grid + the Bala Bhavishyath section below it
      loan-application/
        models.ts, loan-application.service.ts
        loan-application-page/                    "Apply for a Loan" dropdown + form (login-gated)
      manager/
        models.ts, manager.service.ts             CustomerSummary types + GET /manager/customers
        manager-dashboard/                        Routed page at /manager (not a dropdown): customer table (age, mobile, email, counts), expandable per-row to that customer's loan + deposit applications
  docs/
    deposit-schemes.md      Deposit calculator spec: extracted rates, formulas, calc-type decisions, apply-flow
    loan-applications.md    Loan scheme research (DCCB sites), loan form spec, implementation status
    auth-and-manager.md     Auth design, manager seeding, RBAC, known passlib/bcrypt bug + fix, security caveats
  README.md              Beginner-friendly install (git/Python/Node/Angular) + setup + run instructions
```

## Running locally

See **[README.md](README.md)** for full beginner-friendly instructions (installing Git/Python/Node/Angular from scratch, venv setup, etc). Quick reference once everything is installed:

Backend (Window 1):
```
cd backend
.\venv\Scripts\Activate
uvicorn main:app --reload
```
Runs at http://127.0.0.1:8000. First run seeds a bank-manager account (`12345` / `12345`) and creates `bankapp.db`.

Frontend (Window 2):
```
cd frontend
ng serve
```
Runs at http://127.0.0.1:4200

## Feature 1: Deposit scheme calculator

Full spec, extracted interest-rate tables, and calculation formulas live in **[docs/deposit-schemes.md](docs/deposit-schemes.md)**.

Key decisions: quarterly compounding for all FD-type products; Double Plus Deposit is a fixed ~8y8m "doubling" product; fixed-tenure products (MNSN, RD BB Nidhi, SPL RD) use an **amount slider** while the standard FD ladder uses a **tenure slider**; green theme based on the DCCB-VZM logo. Each card also has an **Apply for this Deposit** button (login required) that records the submission — see Feature 3.

## Feature 2: Loan applications

Full spec, research on real DCCB loan categories, and implementation status live in **[docs/loan-applications.md](docs/loan-applications.md)**. No real Vizianagaram rate data is published anywhere, so this is an intake form only (no rate calculation). Submitting requires login.

## Feature 3: Accounts, applications, and the manager page

Full design (JWT auth, RBAC, manager seeding, routing/guards, a passlib/bcrypt compatibility bug hit and fixed during implementation, security caveats for this demo) lives in **[docs/auth-and-manager.md](docs/auth-and-manager.md)**.

Summary: customers register (username, password, full name, age, mobile, optional email) and log in, then can apply for deposits and loans, each tied to their account. The seeded manager account (`12345`/`12345`) lands on its own **routed page** (`/manager`, not a dropdown) listing every customer who has applied for a deposit and/or loan, with age and contact info, expandable per customer to see exactly what they applied for. Customers can never reach `/manager` (client-side guard + 403 server-side) and a manager can never see the customer pages (redirected back to `/manager` if they try).

**Fixed 2026-09-05:** registration appeared broken due to (1) CORS only allowing `localhost:4200` not `127.0.0.1:4200`, and (2) the register form having no inline validation feedback, so an invalid field (e.g. non-Indian mobile format) silently blocked submission with zero visible error. Both fixed — see docs/auth-and-manager.md for details. **Any new reactive form in this app should include inline per-field error messages from the start**, not just a submit-time banner.

**Changed 2026-09-05:** replaced the inline "Manager Dashboard" dropdown (two flat tables) with a dedicated `/manager` route showing customers grouped with their applications, plus an `age` field added to registration via a non-destructive schema migration (see docs/auth-and-manager.md).

## Conventions

- Keep scheme/rate data in a single config file (`frontend/src/app/deposit-schemes/deposit-schemes.data.ts`) — don't hardcode rates in components.
- Prefer standalone Angular components, no NgModules.
- Don't commit `backend/venv/`, `backend/*.db`, or `frontend/node_modules/` (already gitignored).
- Use `bcrypt` directly for password hashing, not `passlib` — see docs/auth-and-manager.md for why.
- When adding a column to an existing model, add a corresponding step in `database.run_migrations()` (non-destructive `ALTER TABLE`) instead of deleting `bankapp.db` — the dev database may hold real test data worth keeping. Only delete it when you've confirmed (or the user confirms) it's disposable.
- **Update these docs at every checkpoint.** Whenever a feature/change reaches a working, verified state, update this file (structure, status, conventions) and the relevant file under `docs/` (spec, formulas, decisions, open items) as part of finishing the task — don't wait to be asked. The goal is for this repo to be self-contained context for any LLM or contributor picking it up cold.
