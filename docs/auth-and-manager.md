# Authentication & Manager Dashboard — Spec

## What this feature does

- Visitors can **register** an account (username, password, full name, mobile, optional email) and **log in**.
- A logged-in customer can submit loan applications and "apply" for a deposit scheme; both are tied to their account (`user_id`).
- A single hardcoded **bank manager** account (username `12345`, password `12345`) can view every submitted loan application and every submitted deposit application, in a **Manager Dashboard** with two tabs.
- Regular customers cannot see other users' applications or the Manager Dashboard at all (it's not rendered in the frontend, and the backend list endpoints reject non-manager tokens with 403).

## Backend design

- **`backend/models.py`** — `User` (`id`, `username` unique, `password_hash`, `full_name`, `mobile`, `email`, `role` = `"customer"` or `"manager"`, `created_at`), plus `user_id` FK added to `LoanApplication` and the new `DepositApplication` table (`scheme_id`, `scheme_name`, `customer_type`, `amount`, `tenure_days`, `projected_value`). Both application models expose a `username` property (via their `user` relationship) so API responses can show who applied without a separate join query in the route.
- **`backend/auth.py`** — password hashing/verification via the `bcrypt` library directly (**not** `passlib` — passlib's bcrypt backend is broken with bcrypt ≥ 4.x, see "Known issue" below). JWT creation/decoding via `python-jose` (`HS256`, 12-hour expiry). `get_current_user` dependency decodes the bearer token; `require_manager` wraps it and raises 403 if `role != "manager"`.
- **`backend/main.py`** — seeds the manager account on startup if a user named `12345` doesn't already exist (`seed_manager_account()`). Endpoints:
  - `POST /auth/register` — creates a `role="customer"` user (400 if username taken). Can't self-register as manager.
  - `POST /auth/login` — plain JSON `{username, password}` (not OAuth2 form-encoding — simpler for the Angular client), returns `{access_token, role, username}`.
  - `POST /loan-applications`, `POST /deposit-applications` — require any authenticated user; `user_id` comes from the token, not the request body.
  - `GET /loan-applications`, `GET /deposit-applications` — require `role="manager"`.

### Known issue: don't use `passlib` for bcrypt hashing here

`passlib[bcrypt]` 1.7.4's backend detection reads `bcrypt.__about__.__version__`, which was removed in `bcrypt` ≥ 4.0, causing every hash/verify call to fail (`AttributeError` / `ValueError: password cannot be longer than 72 bytes`). This was hit and confirmed during implementation (2026-09-04). Fix used: call the `bcrypt` package directly (`bcrypt.hashpw` / `bcrypt.checkpw`) instead of going through passlib. `passlib` is not in `requirements.txt`.

### Security notes (demo-only — fix before any real deployment)

- `SECRET_KEY` in `auth.py` is a hardcoded string. Move to an environment variable before deploying anywhere real.
- The manager credentials (`12345` / `12345`) are exactly what the user asked for, but are obviously not production-grade — trivial to guess, and the manager account is a single shared login rather than per-manager accounts.
- No password complexity rules, rate limiting, or account lockout.

## Frontend design

- **`frontend/src/app/auth/`** — `models.ts` (types), `auth.service.ts` (signals for current user/token, persisted to `localStorage` under `bankapp_auth`, `login()`/`register()`/`logout()`), `auth.interceptor.ts` (functional `HttpInterceptorFn` that attaches `Authorization: Bearer <token>` to every request when a token is present), `account-page/` (the "Login / Register" dropdown — tabs for login vs. register when logged out, shows username/role + a logout button when logged in).
- **`frontend/src/app/manager/manager-dashboard/`** — a dropdown titled "Manager Dashboard", rendered in `app.html` only when `AuthService.isManager()` is true. Two tabs ("Loan Applications" / "Deposit Applications"), each a table fetched via `LoanApplicationService.listAll()` / `DepositApplicationService.listAll()` on open.
- **Gating**: `loan-application-page` shows a "please log in" message instead of the form when logged out. `scheme-card` shows an "Apply for this Deposit" button that, if clicked while logged out, shows an inline error instead of calling the API (real enforcement is the backend's 401).
- `deposit-application.service.ts` lives under `frontend/src/app/deposit-schemes/` (not `auth/`) since it's deposit-specific; it POSTs the scheme id/name, customer type, amount, tenure, and the already-computed projected maturity value from the scheme card's sliders — no separate form needed.

## Verification performed (2026-09-04)

Full Playwright run: register → log in as customer → apply for a deposit scheme → apply for a loan → log out (Manager Dashboard correctly absent while logged out) → log in as manager (`12345`/`12345`) → Manager Dashboard tabs both show the customer's submissions with the correct username, amounts, and timestamps. Zero console errors. `ng build` clean.

## Open items

- No "my applications" view for a logged-in customer to see their own submission history (only the manager can currently list applications). Add if requested.
- No password reset / email verification flow.
- Only one manager account exists (seeded); there's no UI to promote another user to manager.
