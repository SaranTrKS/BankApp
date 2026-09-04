# BankApp

Sample banking web app for **DCCB-VZM** (District Co-operative Central Bank, Vizianagaram, Andhra Pradesh). Three features: (1) a public-facing **deposit scheme calculator**, (2) a **loan application intake** form, (3) **user accounts + a bank-manager dashboard** that ties the two together. All three are implemented and verified as of 2026-09-04.

## Tech stack

- **Backend:** Python + FastAPI, SQLite (via SQLAlchemy), venv-managed. Auth via `bcrypt` (password hashing) + `python-jose` (JWT).
- **Frontend:** Angular 22 (standalone components, no NgModules), SCSS
- **Charts:** Chart.js (frontend deposit calculator)

## Repo layout

```
BankApp/
  backend/
    main.py             FastAPI app: routes, CORS, manager-account seeding on startup
    auth.py             Password hashing (bcrypt directly — see docs/auth-and-manager.md), JWT, get_current_user/require_manager deps
    database.py         SQLAlchemy engine/session (SQLite file: backend/bankapp.db, gitignored)
    models.py           User, LoanApplication, DepositApplication ORM models
    schemas.py          Pydantic request/response schemas
    requirements.txt
    venv/
  frontend/
    src/app/
      app.ts / app.html / app.scss              Shell: DCCB-VZM header, green theme, assembles all dropdowns
      app.config.ts                              provideHttpClient + authInterceptor registered here
      auth/
        models.ts, auth.service.ts, auth.interceptor.ts
        account-page/                            "Login / Register" dropdown (tabs; shows logout when signed in)
      deposit-schemes/
        models.ts                                DepositScheme / RateSlab / CustomerType types
        calculators.ts                            FD/RD/doubling/flat-interest formulas
        deposit-schemes.data.ts                   All 9 scheme configs (source of truth for rates)
        deposit-application.service.ts            POST/GET for "apply for this deposit"
        chart-line/                               Chart.js line-chart wrapper component
        scheme-card/                              Slider + customer-type toggle + chart + maturity value + Apply button
        deposit-schemes-page/                     "Deposit Schemes" dropdown + responsive card grid
      loan-application/
        models.ts, loan-application.service.ts
        loan-application-page/                    "Apply for a Loan" dropdown + form (login-gated)
      manager/
        manager-dashboard/                        "Manager Dashboard" dropdown (manager-only), two tabs of tables
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

## Feature 3: Accounts, applications, and the manager dashboard

Full design (JWT auth, RBAC, manager seeding, a passlib/bcrypt compatibility bug hit and fixed during implementation, security caveats for this demo) lives in **[docs/auth-and-manager.md](docs/auth-and-manager.md)**.

Summary: customers register/log in and can then apply for deposits and loans, each tied to their account. A single seeded manager account (`12345`/`12345`) can see every submission across both features in a two-tab dashboard, hidden from regular users both in the UI and via a 403 on the backend list endpoints.

## Conventions

- Keep scheme/rate data in a single config file (`frontend/src/app/deposit-schemes/deposit-schemes.data.ts`) — don't hardcode rates in components.
- Prefer standalone Angular components, no NgModules.
- Don't commit `backend/venv/`, `backend/*.db`, or `frontend/node_modules/` (already gitignored).
- Use `bcrypt` directly for password hashing, not `passlib` — see docs/auth-and-manager.md for why.
- **Update these docs at every checkpoint.** Whenever a feature/change reaches a working, verified state, update this file (structure, status, conventions) and the relevant file under `docs/` (spec, formulas, decisions, open items) as part of finishing the task — don't wait to be asked. The goal is for this repo to be self-contained context for any LLM or contributor picking it up cold.
