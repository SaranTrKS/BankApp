# Authentication & Manager Dashboard — Spec

> **2026-09-23: auth was migrated from username/password to Google Sign-In.** Everything below the "Change (2026-09-23): migrated to Google Sign-In" section describes the **current** system. The sections above it (bug fixes from 2026-09-05) describe the old password-based system for historical context — the specific endpoints/forms they mention (`/auth/register`, `/auth/login`, the seeded `12345`/`12345` account) **no longer exist**, but the debugging lessons in them (CORS, inline validation, `NG0203`/`NG0200`, stale reload processes) still apply to this app generally.

## What this feature does

- Visitors sign in with their **Google account** — no separate signup form, no password of ours to manage. First-time sign-in creates the account automatically.
- A first-time customer is asked to fill in **age and mobile number** once (Google doesn't hand those over) before they can apply for anything.
- Whether someone becomes a **customer** or a **manager** is decided by their Gmail address against an allowlist in `backend/google_config.py` — editable by whoever runs this app, no code change or migration needed. Anyone not on the list is a customer.
- A manager gets a genuinely **separate page** (route `/manager`, not just a dropdown mixed into the customer page) listing **every** registered customer, with age/mobile/email and any loans/deposits they've applied for, expandable per customer.
- Regular customers cannot see the manager page or other users' applications (route-guarded client-side, and 403'd server-side).

## Change (2026-09-23): migrated to Google Sign-In, password auth removed

**Why:** the user wanted people to log in with their existing Gmail account instead of creating a new username/password for this app, and wanted to assign the bank-manager role by Gmail address rather than a single shared hardcoded login.

**Decisions confirmed with the user before building this:**
1. Google becomes the *only* way to log in — the old username/password flow, the register form, and the seeded `12345`/`12345` manager account are all removed (not just deprecated).
2. Since Google doesn't provide age or mobile number, a first-time customer sees a **one-time "complete your profile" step** (blocks the rest of the app, not just the apply buttons) instead of making those fields optional everywhere.

### How it works

**Frontend → Backend flow:**
1. `index.html` loads Google's Identity Services script (`https://accounts.google.com/gsi/client`).
2. `account-page` renders Google's own "Sign in with Google" button into a `<div #googleBtn>` (only once the account panel is opened, and only if not already logged in — see the code comment in `account-page.ts` for why it can't just render on `ngOnInit`: the div lives behind an `@if` for the panel, so it doesn't exist in the DOM until the panel opens).
3. Clicking the button runs Google's own popup/flow and calls back with a **credential** — a signed ID token (a JWT) containing the user's verified email, name, and Google user ID (`sub`). This is the only thing sent to our backend; we never see their Google password.
4. `AuthService.loginWithGoogle(credential)` posts `{credential}` to `POST /auth/google`.
5. The backend verifies the token's signature against Google's public keys via the `google-auth` library (`id_token.verify_oauth2_token`), checking it was issued for *our* Client ID and that `email_verified` is true. This is the entire trust boundary: once the signature checks out, the email inside it is treated as fact.
6. Looks up a `User` by that email. First time → auto-creates the account (role decided by the `MANAGER_EMAILS` allowlist). Every time → re-syncs `role` against that same allowlist, so editing the config file and having that person sign in again is enough to promote/demote them — no manual DB edit.
7. Issues our own existing app JWT (`auth.create_access_token`, unchanged) and returns `{access_token, role, username}`. Everything downstream — `authInterceptor`, `/auth/me`, `managerGuard` — is untouched by this migration.

**Required setup (not committed — see below):**
- `backend/google_config.py` — `GOOGLE_CLIENT_ID` (from Google Cloud Console → APIs & Services → Credentials → "Create OAuth client ID" → Web application, with `http://localhost:4200` as an authorized JavaScript origin) and `MANAGER_EMAILS` (a Python set of Gmail addresses).
- `frontend/src/app/auth/google-client-id.ts` — the **same** Client ID, on the frontend side. This value is meant to be public (it identifies the app, not a secret) — the actual security boundary is the signature check on the backend, not hiding this string.
- Until both are filled in, `/auth/google` returns a clear `500` ("Google Sign-In isn't configured yet…") instead of crashing, and the frontend shows a matching banner instead of a broken/invisible button — verified by testing with both fields left empty.

### Backend changes

- **`backend/models.py`** — added `google_sub` (nullable, unique) to `User`. `password_hash` stays `NOT NULL` in the schema (avoiding a SQLite table-rebuild migration) but is no longer read or written for real — Google-created accounts just get `""` there. `username` is auto-derived from the Google display name (or the email's local part) and de-duplicated with a numeric suffix if taken (`_derive_unique_username` in `main.py`).
- **`backend/database.py`** — `run_migrations()` gained one more guarded `ALTER TABLE users ADD COLUMN google_sub VARCHAR(50)` step, same non-destructive pattern as the earlier `age` migration.
- **`backend/auth.py`** — `hash_password`/`verify_password` deleted (no more passwords to hash). Switched from `OAuth2PasswordBearer` (which pointed at the now-deleted `/auth/login`) to plain `HTTPBearer` — `get_current_user` is otherwise unchanged (still decodes our own JWT, still checks `sub` against the `users` table).
- **`backend/main.py`**:
  - `seed_manager_account()` deleted — there's no more single seeded manager; role comes from `MANAGER_EMAILS` at every Google login instead.
  - `POST /auth/register` and `POST /auth/login` deleted.
  - **New:** `POST /auth/google` — see the flow above.
  - **New:** `PATCH /auth/complete-profile` — `{age, mobile}`, requires login, updates the current user's row (same validation as the old registration form: age 1–120, Indian mobile pattern).
  - `GET /auth/me`, the loan/deposit endpoints, and `GET /manager/customers` are unchanged by this migration (they already worked off the JWT, not the login method).
- **`backend/schemas.py`** — `UserCreate`/`LoginRequest` deleted; added `GoogleLoginRequest` (`{credential: str}`) and `CompleteProfileRequest` (`{age, mobile}`).
- **New dependencies:** `google-auth` (ID token verification) and `requests` (its transport layer needs it) — both added to `requirements.txt`. `bcrypt` was removed from `requirements.txt` since nothing hashes passwords anymore.

### Frontend changes

- **`frontend/src/app/auth/google-client-id.ts`** — the Client ID constant (empty by default — see setup above).
- **`frontend/src/app/auth/google-identity.d.ts`** — minimal ambient TypeScript types for the `window.google.accounts.id` API the GSI script attaches, since it's a plain `<script>` tag, not an npm package.
- **`frontend/src/app/auth/models.ts`** — `RegisterPayload`/`LoginPayload` deleted. `AuthUser` now carries `age`/`mobile` (needed for the profile-completion check) alongside `username`/`role`. Added `CompleteProfilePayload`.
- **`frontend/src/app/auth/auth.service.ts`** — `login()`/`register()` replaced with `loginWithGoogle(credential)` (posts to `/auth/google`, then immediately fetches `/auth/me` to populate the full profile including age/mobile) and `completeProfile(payload)` (patches `/auth/complete-profile`). Storage simplified to just the raw token string under `bankapp_token` (previously the whole `TokenResponse` object was stored under `bankapp_auth`; profile fields are always fetched fresh from `/auth/me` instead of trusted from local storage). Added a `needsProfileCompletion` computed signal (`true` for a logged-in customer with `age === null || mobile === null`; managers are exempt — they don't need age/mobile for their own page). The existing `verifying`/`whenReady()` re-verification design (see the 2026-09-05 bug-fix section above) is unchanged — it now calls the renamed `refreshProfile()` instead of `verifySession()`, same microtask-deferral reasoning.
- **`frontend/src/app/auth/account-page/`** — rewritten: no more Login/Register tabs or forms, just Google's rendered button when logged out (or a "not configured yet" banner if the Client ID is empty) and a "Sign out" button when logged in.
- **`frontend/src/app/auth/complete-profile/`** (new) — a small standalone form (age, mobile) shown by `home-page` in place of the deposit calculator + loan form whenever `needsProfileCompletion()` is true. Disappears automatically once saved (the signal flips as soon as `AuthService.completeProfile()` resolves).
- **`frontend/src/app/home-page/home-page.html`** — now branches on `needsProfileCompletion()` instead of always rendering the deposit/loan pages. A logged-out visitor is unaffected (the computed is `false` when there's no user at all) — the calculator stays public, only "Apply" was ever login-gated.
- `index.html` — added the Google Identity Services `<script>` tag.

### Verified

- Backend: with `GOOGLE_CLIENT_ID` empty, `POST /auth/google` returns `500` with a clear message instead of crashing. Seeded a Google-shaped user directly in the DB (no real Google token available in this environment) and confirmed `GET /auth/me`, `PATCH /auth/complete-profile`, and `GET /manager/customers` (after temporarily flipping that user's role) all work correctly against the new schema/auth chain.
- Frontend (Playwright): account panel shows no password fields anywhere, shows the Google sign-in intro copy and the "not configured" banner (since no real Client ID exists in this dev environment); planting a valid JWT for a profile-incomplete customer and reloading shows the "One more thing" form instead of the deposit calculator; submitting age/mobile through that form correctly reveals the normal page and hides the form. Zero console errors, clean `ng build`.
- **Not verified end-to-end** (needs a real Google Cloud OAuth Client ID, which only the person deploying this app can create): the actual "Sign in with Google" popup flow. Once `GOOGLE_CLIENT_ID` is set in both config files, walk through it once by hand to confirm.

### Security notes (demo-only — fix before any real deployment)

- `SECRET_KEY` in `auth.py` is still a hardcoded string (unchanged by this migration) — our own JWTs are signed with it. Move to an environment variable before deploying anywhere real.
- The entire trust model now rests on Google's ID token signature check. `MANAGER_EMAILS` is a plaintext list in a committed-looking file — fine for a demo, but a real deployment would want this in an environment variable or a DB table, not a source file.
- No rate limiting or account lockout (there's no password to brute-force anymore, but the `/auth/google` endpoint itself isn't rate-limited).

## Older history (password-auth era, superseded above)

The sections below describe the username/password system this app used from 2026-09-04 through 2026-09-22. Kept for the debugging lessons they contain — the specific forms/endpoints they describe are gone.

### Known issue (historical): don't use `passlib` for bcrypt hashing

`passlib[bcrypt]` 1.7.4's backend detection reads `bcrypt.__about__.__version__`, which was removed in `bcrypt` ≥ 4.0, causing every hash/verify call to fail (`AttributeError` / `ValueError: password cannot be longer than 72 bytes`). This was hit and confirmed during implementation (2026-09-04). Fix used at the time: call the `bcrypt` package directly instead of going through passlib. Moot now that there's no password hashing at all, but worth remembering if password auth is ever reintroduced.

### Bug fixed (historical, 2026-09-05): "Register is not working"

Root cause was two issues: (1) CORS only allowed `http://localhost:4200`, silently blocking every API call made from `http://127.0.0.1:4200`; (2) the register form had no inline per-field validation, so an invalid field (e.g. a non-Indian mobile format) silently blocked submission with zero visible error. **Lesson that still applies:** any reactive form in this app must render inline per-field errors, not just a submit-time banner — an invalid-and-silent form is indistinguishable from a broken one. The `complete-profile` form built in this migration follows that lesson.

### Bug fixed (historical, 2026-09-05): manager dashboard visible without a real login

A token restored from `localStorage` was trusted unconditionally, forever, with no server-side check — closing a tab without explicitly logging out left the *next* person on that browser silently treated as the manager. Fixed by adding `GET /auth/me` and having `AuthService` re-verify any restored token before trusting it, gating the whole app behind a `verifying`/`whenReady()` signal (a "Checking session…" placeholder shows while this is in flight). **This design is preserved unchanged in the Google migration** — it now re-verifies the token via the same `/auth/me` endpoint regardless of *how* the token was obtained.

Two Angular pitfalls surfaced and fixed while building this, both still relevant to any future async-guard/service work in this app:
1. `NG0203` — an async `CanActivateFn` guard called `inject(Router)` *after* an `await`. `inject()` only works during the synchronous portion of a function. Fix: call `inject()` for everything needed, before any `await`.
2. `NG0200` — `AuthService`'s constructor called `http.get()` synchronously, which passes through `authInterceptor`, which calls `inject(AuthService)` — but the singleton wasn't finished constructing yet. Fix: defer the call to a microtask (`Promise.resolve().then(...)`).

A later "still visible" report turned out to be a stale browser tab/dev-server issue, not a code bug — re-verified against a matrix of (no token / fake token / real customer token / real manager token) with a freshly restarted dev server, all four correct.

### Change (historical, 2026-09-23, same day as the Google migration): manager sees every registered customer, not just applicants

Just before the Google migration, `GET /manager/customers` was changed to drop its "has ≥1 application" filter and return every customer, so the manager can see the full customer base, not just people who applied for something. This behavior is unchanged by the Google migration — it's still every `role="customer"` row, now just populated via Google sign-in instead of registration.

**Debugging note that generalizes beyond this one change:** while verifying it, the API kept returning stale (filtered) results even after the source file was edited and the terminal logged a reload. Root cause: a second, orphaned `uvicorn --reload` process from an earlier session was still alive and still holding the port — only one process can actually own a listening socket on Windows, so requests were silently served by whichever one still had it. **This recurred again while building the Google migration** (two stale processes were found and killed the same way). **Lesson: if a backend change doesn't seem to take effect despite a clean edit and a logged reload, check for a duplicate `uvicorn`/`python` process on the port (`Get-NetTCPConnection -LocalPort 8000` on Windows) before assuming the code is wrong** — always confirm with a fresh, single process when a change seems to have "no effect."

## Open items

- The actual Google popup flow is untested end-to-end pending a real `GOOGLE_CLIENT_ID` — see "Verified" above.
- No "my applications" view for a logged-in customer to see their own submission history (only the manager can currently list applications). Add if requested.
- `MANAGER_EMAILS` lives in a plain Python file — fine for a demo, would move to an environment variable or DB table for anything real.
- The manager table shows every customer, unpaginated — fine at demo scale, would need pagination for a real customer base.
- No UI shows a customer their own `google_sub`/email; not needed yet but would matter if multiple Google accounts per person ever became a concern.
