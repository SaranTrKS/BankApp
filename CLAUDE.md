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
      app.ts / app.html / app.scss        Shell: DCCB-VZM header + green theme
      deposit-schemes/
        models.ts                         DepositScheme / RateSlab / CustomerType types
        calculators.ts                    FD/RD/doubling/flat-interest formulas
        deposit-schemes.data.ts           All 9 scheme configs (source of truth for rates)
        chart-line/                       Chart.js line-chart wrapper component
        scheme-card/                      Slider + customer-type toggle + chart + maturity value
        deposit-schemes-page/             "Deposit Schemes" dropdown + responsive card grid
  docs/
    deposit-schemes.md   Full spec: extracted rates, formulas, calc-type decisions, implementation status
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

**Status (2026-09-04): implemented and verified.** All 9 scheme cards render in a responsive grid (3 cols desktop → 2 → 1 mobile), sliders recompute the chart + maturity value live, customer-type toggle swaps rates correctly. Verified with a headless Playwright smoke test (no console errors) + visual screenshot check. `ng build` passes clean.

## Feature 2: Loan applications

Not yet designed — to be specified in a future session. Will need a SQLite table/model + FastAPI endpoints + an Angular form, following the same structure as the deposit feature.

## Conventions

- Keep scheme/rate data in a single config file (`frontend/src/app/deposit-schemes/deposit-schemes.data.ts`) — don't hardcode rates in components.
- Prefer standalone Angular components, no NgModules.
- Don't commit `backend/venv/` or `frontend/node_modules/` (already gitignored).
- **Update these docs at every checkpoint.** Whenever a feature/change reaches a working, verified state, update this file (structure, status, conventions) and the relevant file under `docs/` (spec, formulas, decisions, open items) as part of finishing the task — don't wait to be asked. The goal is for this repo to be self-contained context for any LLM or contributor picking it up cold.
