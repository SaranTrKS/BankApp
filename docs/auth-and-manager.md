# Authentication & Manager Dashboard — Spec

## What this feature does

- Visitors can **register** an account (username, password, full name, age, mobile, optional email) and **log in**.
- A logged-in customer can submit loan applications and "apply" for a deposit scheme; both are tied to their account (`user_id`). Customers only ever see the customer pages (deposit calculator + loan form) — they cannot reach the manager page even by typing its URL directly.
- A single hardcoded **bank manager** account (username `12345`, password `12345`) gets a genuinely **separate page** (route `/manager`, not just a dropdown mixed into the customer page) listing every customer who has applied for a deposit and/or a loan, with their age and mobile/email, expandable to see exactly what they applied for.
- Regular customers cannot see the manager page or other users' applications (route-guarded client-side, and 403'd server-side).

## Backend design

- **`backend/models.py`** — `User` (`id`, `username` unique, `password_hash`, `full_name`, `age`, `mobile`, `email`, `role` = `"customer"` or `"manager"`, `created_at`), plus `user_id` FK added to `LoanApplication` and the new `DepositApplication` table (`scheme_id`, `scheme_name`, `customer_type`, `amount`, `tenure_days`, `projected_value`). Both application models expose a `username` property (via their `user` relationship) so API responses can show who applied without a separate join query in the route.
- **`backend/database.py`** — `run_migrations()`, called once at startup after `Base.metadata.create_all()`. SQLAlchemy's `create_all` only creates *missing tables*, not missing *columns* on tables that already exist, so adding `age` to `User` needed a manual `ALTER TABLE users ADD COLUMN age INTEGER` guarded by an `inspect(engine).get_columns()` check — this preserves any existing rows/data instead of requiring the SQLite file to be deleted and recreated. Verified (2026-09-05) against a hand-built pre-migration users table with a real row: after running, the column was added and the existing row's data was intact with `age = NULL`.
- **`backend/auth.py`** — password hashing/verification via the `bcrypt` library directly (**not** `passlib` — passlib's bcrypt backend is broken with bcrypt ≥ 4.x, see "Known issue" below). JWT creation/decoding via `python-jose` (`HS256`, 12-hour expiry). `get_current_user` dependency decodes the bearer token; `require_manager` wraps it and raises 403 if `role != "manager"`.
- **`backend/main.py`** — seeds the manager account on startup if a user named `12345` doesn't already exist (`seed_manager_account()`). Endpoints:
  - `POST /auth/register` — creates a `role="customer"` user (400 if username taken), now requires `age` (1–120). Can't self-register as manager.
  - `POST /auth/login` — plain JSON `{username, password}` (not OAuth2 form-encoding — simpler for the Angular client), returns `{access_token, role, username}`.
  - `POST /loan-applications`, `POST /deposit-applications` — require any authenticated user; `user_id` comes from the token, not the request body.
  - `GET /loan-applications`, `GET /deposit-applications` — still exist (manager-only, flat lists), kept for API completeness even though the frontend no longer calls them directly.
  - `GET /manager/customers` (manager-only) — the endpoint the manager page actually uses. Returns customers (`role="customer"`) who have **at least one** loan or deposit application, each with their profile (age, mobile, email) and nested `loan_applications` / `deposit_applications` arrays (`schemas.CustomerSummary`).

### Known issue: don't use `passlib` for bcrypt hashing here

`passlib[bcrypt]` 1.7.4's backend detection reads `bcrypt.__about__.__version__`, which was removed in `bcrypt` ≥ 4.0, causing every hash/verify call to fail (`AttributeError` / `ValueError: password cannot be longer than 72 bytes`). This was hit and confirmed during implementation (2026-09-04). Fix used: call the `bcrypt` package directly (`bcrypt.hashpw` / `bcrypt.checkpw`) instead of going through passlib. `passlib` is not in `requirements.txt`.

### Security notes (demo-only — fix before any real deployment)

- `SECRET_KEY` in `auth.py` is a hardcoded string. Move to an environment variable before deploying anywhere real.
- The manager credentials (`12345` / `12345`) are exactly what the user asked for, but are obviously not production-grade — trivial to guess, and the manager account is a single shared login rather than per-manager accounts.
- No password complexity rules, rate limiting, or account lockout.

## Frontend design

- **`frontend/src/app/auth/`** — `models.ts` (types, now including `age`), `auth.service.ts` (signals for current user/token, persisted to `localStorage` under `bankapp_auth`, `login()`/`register()`/`logout()`), `auth.interceptor.ts` (functional `HttpInterceptorFn` that attaches `Authorization: Bearer <token>` to every request when a token is present), `manager.guard.ts` (functional `CanActivateFn`: allows navigation to `/manager` only when `AuthService.isManager()`, otherwise redirects to `/`), `account-page/` (the "Login / Register" dropdown, always visible in `app.html`'s shell above the router outlet — tabs for login vs. register when logged out including the new Age field, shows username/role + a logout button when logged in; on successful login it navigates to `/manager` or `/` based on the returned role).
- **Routing** (`app.routes.ts`): `''` → `HomePage` (deposit calculator + loan form — the "current pages" every non-manager user gets), `'manager'` → `ManagerDashboard` guarded by `managerGuard`, `'**'` → redirect to `''`. `HomePage.ngOnInit()` also redirects a manager away to `/manager` if they land on `/` (e.g. by typing the URL or a stale bookmark) — so the manager only ever sees their own page, matching the request that everyone else keeps "the current pages only."
- **`frontend/src/app/manager/`** — `models.ts` (`CustomerSummary` etc., mirroring the backend schema), `manager.service.ts` (`getCustomers()` → `GET /manager/customers`), `manager-dashboard/` — now a full routed **page** (no dropdown chrome), not embedded inline in `app.html` anymore. Shows summary stat tiles (customer/loan/deposit counts) and a table of customers (username, full name, age, mobile, email, loan count, deposit count); clicking a row expands it in place to show that customer's individual loan and deposit applications in full detail (amount, tenure, purpose/scheme, projected value, submitted date).
- **Gating**: `loan-application-page` shows a "please log in" message instead of the form when logged out. `scheme-card` shows an "Apply for this Deposit" button that, if clicked while logged out, shows an inline error instead of calling the API (real enforcement is the backend's 401).
- `deposit-application.service.ts` lives under `frontend/src/app/deposit-schemes/` (not `auth/`) since it's deposit-specific; it POSTs the scheme id/name, customer type, amount, tenure, and the already-computed projected maturity value from the scheme card's sliders — no separate form needed.

## Verification performed (2026-09-04, updated 2026-09-05)

Full Playwright run: register (with age) → log in as customer → confirm `/manager` redirects a customer to `/` and the Manager Dashboard is not rendered → apply for a deposit scheme → apply for a loan → log out → log in as manager (`12345`/`12345`) → confirm auto-navigation to `/manager` → confirm the customer's row shows the correct age and mobile → expand the row and confirm both the loan and deposit application appear with correct details → confirm a manager navigating to `/` gets bounced straight back to `/manager`. Zero console errors. `ng build` clean. Migration verified separately against a hand-built pre-migration SQLite file (see database.py note above).

## Bug fixed (2026-09-05): "Register is not working"

User reported registration appeared broken. Root cause was actually **two separate issues**, both fixed:

1. **CORS was too narrow.** `main.py`'s `CORSMiddleware` only allowed `http://localhost:4200`. If the browser loads the frontend from `http://127.0.0.1:4200` instead (an easy thing to type, bookmark, or get auto-suggested), every API call — register included — is silently blocked by the browser's CORS policy, and the app just shows a generic failure. Fixed by allowing both `http://localhost:4200` and `http://127.0.0.1:4200` in `allow_origins`.
2. **The real, more likely culprit: the register form had no per-field validation feedback at all.** `account-page.html`'s register form only showed a generic error banner on an HTTP failure — nothing rendered when the Angular reactive form itself was simply *invalid* (e.g., the mobile number didn't match the strict `^[6-9]\d{9}$` Indian-format pattern, or the password was under 4 characters). Clicking "Create account" would silently do nothing but mark fields as touched, with zero visible indication of what was wrong. To a non-technical user this reads exactly as "registration is broken." Fixed in `account-page.ts`/`.html`: added inline `field-error` messages under each register field (mirroring the pattern already used in `loan-application-page.html`), a banner ("Please fix the highlighted fields below.") when the form is invalid on submit, and a proper `extractErrorMessage()` helper that turns FastAPI's 422 validation-error arrays and network/CORS failures (`status === 0`) into readable text instead of `[object Object]` or a silent no-op.

Reproduced and verified via Playwright: submitting a US-style mobile number (`1234567890`) now shows "Enter a valid 10-digit Indian mobile number (starts with 6-9, no spaces or +91)." inline plus the summary banner; correcting it completes registration successfully.

**Lesson for future forms in this app:** any reactive form must render inline per-field errors, not just a submit-time banner — an invalid-and-silent form is indistinguishable from a broken one to the end user.

## Bug fixed (2026-09-05): manager dashboard visible without a real login

User reported the manager dashboard was showing up without actually logging in as manager. Reproduced with Playwright by planting a completely fake token (`{access_token: 'fake.stale.token', role: 'manager', username: '12345'}`) directly into `localStorage` on a fresh browser context, then loading the app: it landed straight on `/manager` with the dashboard rendered — no login required. Root cause: `AuthService` trusted whatever was in `localStorage` unconditionally, forever, with no expiry check and no server-side validation. In practice this meant: log in as manager once, close the tab without clicking "Log out" (a very easy thing to do), and the *next* person to open the app on that browser/profile — even having done nothing themselves — is silently treated as the manager.

**Fix** — sessions restored from `localStorage` are now re-verified against the backend before anything trusts them:
- New `GET /auth/me` endpoint (backend) — returns the current user's profile if the bearer token is genuinely valid (via the existing `get_current_user` dependency, which checks the JWT signature and expiry), 401 otherwise.
- `AuthService` (frontend) now has a `verifying` signal and a `whenReady(): Promise<void>`. On construction, if a token was restored from `localStorage`, it calls `GET /auth/me`; on success it trusts the (fresh, server-confirmed) role; on any failure it clears the stored session entirely. `managerGuard` and `HomePage.ngOnInit` both `await auth.whenReady()` before making any decision. `app.html` shows a brief "Checking session…" placeholder instead of the account bar/router content while this is in flight, so there's no flash of a stale logged-in state either.
- Verified via Playwright: a fake/garbage token is now rejected and the session cleared (lands on `/`, shows "Login / Register"); a genuine manager login still correctly **survives** a full page reload (confirmed via network trace: `GET /auth/me` → 200 → still on `/manager`); a genuine customer session likewise survives reload.

**Two bugs surfaced and fixed while building this:**
1. `managerGuard` was written as an `async` function that called `inject(Router)` *after* an `await` — Angular only allows `inject()` during the synchronous portion of a function's execution, so this threw `NG0203` and silently broke the guard. Fixed by calling `inject(Router)` up front, before the `await`, and reusing the reference afterward.
2. `AuthService`'s constructor called `this.http.get('/auth/me')` synchronously. That request passes through `authInterceptor`, which calls `inject(AuthService)` to read the token — but Angular hadn't finished constructing the `AuthService` singleton yet (still inside its own constructor), so this tripped `NG0200: Circular dependency detected`. Fixed by deferring the verification call to a microtask (`Promise.resolve().then(() => this.verifySession())`) so it runs after the constructor has returned and the singleton is fully registered.

**Lesson for this app:** never trust `localStorage`-restored auth state at face value — always re-validate it against the server before granting access, and remember that an Angular service's own constructor is too early to make HTTP calls that route back through interceptors injecting that same service.

## Open items

- No "my applications" view for a logged-in customer to see their own submission history (only the manager can currently list applications). Add if requested.
- No password reset / email verification flow.
- The login form still has no per-field inline validation (less risky since both fields are just "required", but consider the same treatment if issues recur).
- Only one manager account exists (seeded); there's no UI to promote another user to manager.
- Customers registered before the `age` column existed (none in practice — this is a dev app) would show `age = NULL` / "—" in the manager table rather than being backfilled.
- The manager table shows every customer with ≥1 application, unpaginated — fine at demo scale, would need pagination for a real customer base.
