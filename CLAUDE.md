# BankApp

Sample banking web app for **DCCB-VZM** (District Co-operative Central Bank, Vizianagaram, Andhra Pradesh). Built for two features: (1) a public-facing **deposit scheme calculator** on the landing page, and (2) a **loan application intake** form that saves submissions to a database.

## Tech stack

- **Backend:** Python + FastAPI, SQLite (via SQLAlchemy), venv-managed
- **Frontend:** Angular 22 (standalone components, no NgModules), SCSS
- **Charts:** Chart.js (frontend deposit calculator)

## Repo layout

```
BankApp/
  backend/           FastAPI app, venv, requirements.txt
    main.py
    venv/
  frontend/          Angular app (ng new --routing --style=scss)
    src/app/
  docs/
    deposit-schemes.md   Full spec: extracted rates, formulas, calc-type decisions
  README.md          Setup + run commands
```

## Running locally

Backend:
```
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```
Runs at http://127.0.0.1:8000

Frontend:
```
cd frontend
ng serve
```
Runs at http://127.0.0.1:4200

## Feature 1: Deposit scheme calculator (landing page)

Full spec, extracted interest-rate tables, and calculation formulas live in **[docs/deposit-schemes.md](docs/deposit-schemes.md)** — read that before touching anything under `frontend/src/app/deposit-schemes/`.

Key decisions (see docs file for detail/rationale):
- Quarterly compounding for all FD-type products.
- Double Plus Deposit is a fixed ~8y8m tenure "doubling" product, not tenure-flexible.
- Fixed-tenure products (MNSN, RD BB Nidhi, SPL RD) use an **amount slider**; the standard FD ladder uses a **tenure slider** (auto-selects rate slab).
- Theme: green, based on the DCCB-VZM logo (dark green primary + light green accents), mobile-first responsive.

## Feature 2: Loan applications

Not yet designed — to be specified in a future session. Will need a SQLite table/model + FastAPI endpoints + an Angular form, following the same structure as the deposit feature.

## Conventions

- Keep scheme/rate data in a single config file (`frontend/src/app/deposit-schemes/deposit-schemes.data.ts`) — don't hardcode rates in components.
- Prefer standalone Angular components, no NgModules.
- Don't commit `backend/venv/` or `frontend/node_modules/` (already gitignored).
