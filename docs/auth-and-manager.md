# Authentication & Manager Dashboard — Spec

> **2026-11-05: auth was migrated from phone OTP (Firebase) to email OTP (any provider, via Brevo).** Everything below the "Change (2026-11-05): migrated to email OTP via Brevo" section describes the **current** system. The sections above it describe three earlier systems (password-based, Google Sign-In, then Firebase phone OTP) for historical context — the specific endpoints/files they mention (`/auth/register`, `/auth/login`, `/auth/google`, `/auth/firebase`, `/auth/complete-profile`, `backend/google_config.py`, `frontend/.../firebase-config.ts`, the seeded `12345`/`12345` account) **no longer exist**, but the debugging lessons in them still apply to this app generally.

## What this feature does

- Visitors sign in with **any email address** — Gmail, Outlook, a work email, anything. Enter it, get a 6-digit code emailed to you, enter the code, done.
- If the email has never been seen before, a short signup step (full name, age, mobile) runs first — then the same code-by-email step verifies it and creates the account.
- Every customer belongs to one of DCCB-VZM's **25 branches**, chosen at signup from a dropdown sorted nearest-first.
- Three roles, decided from the email at every sign-in: **customer**, **branch manager** (a branch email in `backend/branches.py`) and **super manager** (`SUPER_MANAGER_EMAILS` in `backend/manager_config.py`). See "Change (2026-11-05, later)" below.
- Managers get a genuinely **separate page** (route `/manager`, not just a dropdown mixed into the customer page) listing customers with age/mobile/email/branch and any loans/deposits they've applied for, expandable per customer. A branch manager sees only their branch; a super manager sees all branches with a filter.
- Regular customers cannot see the manager page or other users' applications (route-guarded client-side, and 403'd server-side).

## Change (2026-11-05, latest): kiosk call-back requests

The Head Office kiosk (`/kiosk`, see docs/kiosk.md) lets visitors leave a name + mobile without signing in. These are **not accounts**: they go to a separate `callback_requests` table, never to `users`, and grant no access.

- `GET /manager/callback-requests` / `PATCH /manager/callback-requests/{id}` use `require_manager` with the **same branch scoping as `/manager/customers`** (`_visible_callbacks()`): branch manager → own branch only; super manager → all. A branch manager PATCHing another branch's request gets 404.
- The dashboard got a second tab, **Call-back requests**, with a "N new" badge; mobile numbers are labelled **unverified**.
- `POST /callback-requests` is public, protected by a honeypot, field validation, consent, 3 per mobile per day and 60 per IP per hour (in-memory). Details in docs/kiosk.md.

## Change (2026-11-05, later): branches and three roles

**What the user asked for:** a branch dropdown at signup listing DCCB-VZM's 25 branches (from the scanned list in `Documents/`, see docs/branches.md); each branch's email is that branch's manager; three super managers see every branch; customers who pick a branch are shown to that branch's manager. Then: show each branch's distance from the visitor's current location, with a map link.

**Decisions confirmed with the user before building:**
1. Super managers: `saranravali@gmail.com`, `nivineeru228@gmail.com`, `vzmco201@dccbvzm.org`. The last is the Head Office (branch 201) email, so branch 201 has **no** single-branch manager; its customers are seen by super managers only.
2. Customers can't change their branch after signup (no profile-edit page exists).
3. Customers who signed up before branches existed have `branch_code = NULL`; super managers see them under "No branch selected", branch managers never see them.
4. Applications belong to a branch through their customer; `LoanApplication`/`DepositApplication` have no branch column of their own.
5. Map: approximate coordinates (town centre, from OpenStreetMap), straight-line distance only, and a simple "📍 Map" link to Google Maps. No Maps API key, no embedded map.

### How roles work

`_resync_role()` in `main.py` runs at every OTP verification, as before. Checked in this order:
1. email in `manager_config.SUPER_MANAGER_EMAILS` → `role="super_manager"`, `branch_code=None`. Checked **first** because `vzmco201` is also a branch email.
2. email is a branch email in `branches.BRANCH_BY_EMAIL` → `role="manager"`, `branch_code` = that branch.
3. otherwise → `role="customer"`; `branch_code` stays whatever they chose at signup.

All comparisons use lowercased emails (signup/request-otp already lowercase the input; `SUPER_MANAGER_EMAILS` must be written in lowercase).

**Staff skip the signup form.** `POST /auth/request-otp` used to return `404` for any unknown email, which made the frontend show the customer signup form (name/age/mobile/branch). For a staff email (super manager or branch email) with no account yet, it now creates the `User` row itself and sends the OTP, so managers sign in with just email + code. Their role and branch are set at verification like everyone else's.

### Data model

- `User.branch_code` (Integer, nullable, indexed): customer's chosen branch / manager's branch / `NULL` for super managers and pre-branch customers.
- `User.pending_branch_code`: staged at signup and copied to `branch_code` only when the OTP is verified, the same rule as `pending_full_name` etc. (see the overwrite bug below), so nobody can move someone else's account to another branch without owning the inbox.
- `User.branch_name` is a Python property (looked up from `branches.py`), not a column, so `UserOut`/`CustomerSummary`/`Token` can include it without duplication.
- `run_migrations()` adds both columns with guarded `ALTER TABLE`. Verified on a copy of the local dev DB (11 users, 3 loans, 5 deposits): columns added, every row kept.

### Endpoints

- `GET /branches` (public): code, name, lat, lng, approx for all 25. **Deliberately omits manager emails.**
- `POST /auth/signup`: `branch_code` required; any code not in `branches.py` → `400 "Please choose a valid branch."`.
- `POST /auth/verify-otp` response and `GET /auth/me`: now include `branch_code`/`branch_name`.
- `GET /manager/customers` (`require_manager` = manager **or** super_manager): a branch manager gets only `role="customer"` rows with their `branch_code` (a manager with no branch gets `[]`); query params can't widen this. A super manager gets every customer. **This server-side filter is the access control**; the dashboard's branch filter is just a view over data the super manager is already allowed to see.
- `GET /loan-applications`, `GET /deposit-applications` (unscoped lists of every application): now `require_super_manager`. The frontend doesn't call them, but leaving them on `require_manager` would have let a branch manager read other branches' data.

### Frontend

- `branches/` (new): `Branch` type, `BranchService.getBranches()` (one request, `shareReplay`), `distance.ts` (haversine km + Google Maps URL).
- `account-page` signup step: required **Branch** `<select>`, labels like "Nellimarla (208) — ~6.4 km". On entering the signup step it calls `navigator.geolocation.getCurrentPosition` (8s timeout, low accuracy, 10-min cache). Allowed → sorted nearest first with "Sorted nearest first…" note; blocked/unsupported/timeout → code order with "Allow location access…" note. Signup never waits on location. **The visitor's location is never sent to the server.** Choosing a branch shows a "📍 Map: <branch>" link (new tab). Missing branch → "Choose your branch." banner, cleared as soon as a branch is chosen. Account header shows "(customer · Bobbili)", "(branch manager · Bobbili)" or "(super manager)".
- `AuthUser` gains `branchCode`/`branchName`; `UserRole` gains `'super_manager'`; `AuthService.isManager` is true for both manager roles (so `managerGuard` and the home-page redirect needed no change) and there's a new `isSuperManager`.
- `manager-dashboard`: branch manager heading "Manager Dashboard — Bobbili (202)", own customers only, no Branch column. Super manager: "Manager Dashboard — All Branches", Branch column, and a filter (All / each of the 25 branches / "No branch selected" if any) whose labels carry per-branch counts ("Bobbili (202) — 4 customers, 2 applied"). Stats cards follow the filter.

### Verified (2026-11-05)

- **Backend, 30 scripted checks** against the real app on a throwaway SQLite DB with email sending stubbed: `/branches` public with 25 entries and no emails; signup without branch → 422, branch 999 → 400; unknown customer email → 404; staff emails auto-created; branch email → manager of that branch; `vzmco201` → super manager (not manager); mixed-case super email → super manager; manager 202 sees only 202 even with `?branch=203`; manager 203 sees only 203; super sees all incl. H.O customers; staff never listed as customers; customer → 403; application lists 403 for managers, 200 for super; loan shows up under the right manager; unverified signup stages `pending_branch_code` only.
- **Browser, 27 Playwright checks** (Chromium, local `ng serve` + the stubbed backend): dropdown has 25 branches; with location near Gurla the order starts Gurla → Nellimarla with ascending distances; blocked location → code order, no km; missing branch error appears and clears on selection; Map link URL and new tab; customer signup end-to-end for two branches; customer bounced from `/manager`; branch manager skips signup, sees only their branch, no filter; super manager sees both, Branch column, 26 filter options with counts, filtering works, empty-branch message; no console errors. Clean `ng build` (568 kB, under the 600 kB budget).
- Not verified: real-device geolocation on phones, and whether the `@dccbvzm.org` inboxes actually receive Brevo's OTP emails.

## Change (2026-11-05): migrated to email OTP via Brevo, Firebase phone auth removed

**Why:** the user wanted sign-in to work with *any* email address, not just a phone number — "they don't have to be Gmail... login with an OTP sent to their mail if registered, if not registered then they should signup, give their details, then verify their mail." That ordering (collect details, *then* verify) is the opposite of every prior migration in this app, where verification came first (via a third party) and missing details were collected afterward.

**Decisions confirmed with the user before building this:**
1. Email OTP becomes the *only* way to log in — Firebase phone auth is fully removed (not kept as an alternative).
2. Email is sent via **Brevo**'s HTTP API rather than raw SMTP — chosen over SMTP-via-an-existing-mailbox (e.g. Gmail + an app password) for better deliverability and because it needed no new backend dependency (`requests`, already installed) versus SMTP's own set of gotchas (ports, TLS, provider sending limits). Chosen over Firebase/other phone-style providers because the whole point of this migration is "any email provider," which an email-OTP system handles natively — there's no analogous "any provider" phone OTP without picking a specific SMS gateway.
3. Manager assignment **stays keyed by email** — unchanged in spirit from the Google/Firebase eras, just now the same field is *also* the login identity. (Later the same day the single `MANAGER_EMAILS` list was replaced by branch managers + `SUPER_MANAGER_EMAILS`; see above.)

### How it works

**Two ways into the same verification step:**
- **Returning user:** enters their email → `POST /auth/request-otp {email}` → backend finds an existing `User` row, generates an OTP, emails it. A `404` here (no such account) tells the frontend to show the signup form instead.
- **New user:** after the `404`, fills in full name/age/mobile → `POST /auth/signup {full_name, age, mobile, email}` → backend creates the row (or reuses an unverified one from an abandoned earlier attempt — see the bug below) and sends the OTP the same way.
- **Both converge on:** `POST /auth/verify-otp {email, otp}` → backend checks the code (hashed, time-limited, attempt-limited — see below) and, on success, issues our usual app JWT. This is the only endpoint that actually logs someone in; `request-otp`/`signup` only ever send a code.

**OTP mechanics** (`backend/main.py`): a 6-digit code (`secrets.randbelow`, not `random` — cryptographically unpredictable), SHA-256-hashed into `User.otp_hash` (plaintext OTPs are never stored), with a 10-minute expiry (`otp_expires_at`) and a 5-attempt cap (`otp_attempts`, incremented on each wrong guess, blocking further tries with a `429` once exhausted — a fresh `request-otp`/`signup` call resets it). On successful verification, `otp_hash`/`otp_expires_at`/`otp_attempts` are all cleared, so a code can't be replayed.

**Sending the email** (`backend/email_service.py`): a POST to `https://api.brevo.com/v3/smtp/email` with the API key in an `api-key` header and a `sender`/`to`/`subject`/`htmlContent` JSON body — Brevo's stable "send a transactional email" endpoint. No SDK, just `requests` (already a dependency from the Google Sign-In era).

**Manager role resync:** happens in `_resync_role()`, called both when an existing user's OTP is verified (in case `SUPER_MANAGER_EMAILS` or the branch emails changed since they last logged in) and the first time a *new* signup's OTP is verified (since that's the first moment the email is confirmed real).

### A real bug caught and fixed while building this: unverified rows as an overwrite vector

First implementation: `signup()` looked up the email, and if it found an existing-but-unverified row (`email_verified == False`), it overwrote that row's `full_name`/`age`/`mobile` directly and resent an OTP — reasoning that an unverified row must mean an abandoned signup attempt, safe to retry over. **This was wrong**, and caused real damage: the new `email_verified` column defaults to `False` for *every pre-existing row*, including real accounts from the Google/Firebase eras that were never "unverified" in any meaningful sense — the column simply didn't exist before. A test `signup()` call against a real account's email silently overwrote its real `full_name`/`age`/`mobile` with test data, with no proof the caller controlled that inbox at all.

**Fix:** added `pending_full_name`/`pending_age`/`pending_mobile` columns. `signup()` now always writes to these *staging* columns, never directly to the real profile fields — regardless of whether the row is brand new or a retry over an existing-unverified one. `verify_otp()` only copies `pending_*` → the real fields (and clears `pending_*`) at the moment the OTP is actually confirmed. This closes the gap generally: nobody can mutate any account's real profile — new or existing — without first proving they received a code at that address. Verified by seeding a signup, confirming only the `pending_*` columns were set (not the real fields), then verifying the OTP and confirming the real fields updated and `pending_*` cleared.

**Lesson for this app:** a newly-added boolean column defaulting to `False` for historical rows is not the same claim as "this row was never verified" — code that branches on it needs to consider what it means for data that predates the column, not just data created after it.

### Required setup (not committed — see below)

- A free Brevo account (app.brevo.com) with an **API key** and one **verified sender** email address. The key must come from **SMTP & API → API Keys** and start with `xkeysib-`. A key from the **SMTP** tab (`xsmtpsib-...`) is for SMTP relay only; the HTTP API rejects it with `401 {"message":"Key not found"}` (this exact mix-up happened on 2026-11-05).
- `backend/manager_config.py` — `BREVO_API_KEY` (read from the `BREVO_API_KEY` env var: in the terminal locally, on Render in production; never hardcode it — GitHub push protection rejects commits containing it), `FROM_EMAIL` (the verified sender), `FROM_NAME`, and `SUPER_MANAGER_EMAILS` (replaced `MANAGER_EMAILS` later on 2026-11-05; branch managers come from `backend/branches.py`).
- Until `BREVO_API_KEY`/`FROM_EMAIL` are filled in, every OTP-sending endpoint returns a clear `500` ("Email sign-in isn't configured yet…") instead of crashing — verified by testing with both empty.
- Unlike the Google Client ID or Firebase web config (both public-by-design, checkable client-side), **the Brevo API key must never reach the browser** — it's a real credential that can send email as the verified sender. There is deliberately no frontend config file for this migration; the frontend has no way to know ahead of time whether email sending is configured, and just surfaces the backend's `500` through its normal error banner like any other failure.

### Backend changes

- **`backend/models.py`** — added `email_verified` (bool, default `False`), `otp_hash`, `otp_expires_at`, `otp_attempts`, and the `pending_full_name`/`pending_age`/`pending_mobile` staging columns described above. `email` is now declared `unique=True` (app-level enforcement only, per this app's established non-destructive-migration policy — see below). `mobile`'s stray `unique=True` from the phone-OTP era was removed (it's a profile detail again, not the login identity). `google_sub`/`firebase_uid` are gone from the model entirely (unused across two superseded migrations) — the physical columns remain, harmlessly orphaned, in any database that already has them.
- **`backend/database.py`** — `run_migrations()` gained guarded `ALTER TABLE` steps for all six new columns.
- **`backend/manager_config.py`** — dropped `FIREBASE_PROJECT_ID`, added `BREVO_API_KEY`/`FROM_EMAIL`/`FROM_NAME`. `MANAGER_EMAILS` unchanged. (Filename unchanged from the phone-OTP era — it's generic enough to keep holding "whatever this app's current auth config is" without another rename.)
- **New `backend/email_service.py`** — `send_otp_email()`, the Brevo API call described above. On failure it logs Brevo's status code and JSON body (`ERROR: Brevo rejected the send (401): {...}`) before raising, so the reason shows up in Render's logs; the client just gets a generic `502`.
- **`backend/main.py`**: `POST /auth/firebase` and `PATCH /auth/complete-profile` deleted. New: `POST /auth/signup`, `POST /auth/request-otp`, `POST /auth/verify-otp` (see "How it works"). Helpers: `_derive_unique_username()` (now derives from the email's local part), `_hash_otp()`, `_generate_and_send_otp()`, `_resync_role()`. `GET /auth/me`, the loan/deposit endpoints, and `GET /manager/customers` are unchanged.
- **`backend/schemas.py`** — `FirebaseLoginRequest`/`CompleteProfileRequest` replaced with `SignupRequest` (`{full_name, age, mobile, email}`), `RequestOtpRequest` (`{email}`), `VerifyOtpRequest` (`{email, otp}`).
- **No new dependency** — `requests` (Brevo's API call) was already installed from the Google Sign-In era.

### Frontend changes

- **Firebase removed entirely**: `npm uninstall firebase`, deleted `frontend/src/app/auth/firebase-config.ts`, removed the `#recaptcha-container` div from `index.html`, reverted the `angular.json` bundle budget from `750kB` back to `600kB` (it was only raised for Firebase's ~70KB).
- **`frontend/src/app/auth/models.ts`** — `AuthUser` simplified back to `{ username, role }` (the `fullName`/`age`/`email` fields existed only to drive the now-removed `needsProfileCompletion` check — moot since signup collects everything before any account exists). Added `SignupPayload`.
- **`frontend/src/app/auth/auth.service.ts`** — `loginWithFirebase()`/`completeProfile()`/`needsProfileCompletion` removed; added `requestOtp(email)`, `signup(payload)`, `verifyOtp(email, otp)` (the latter reusing the existing token-then-fetch-profile chain). `verifying`/`whenReady()` and the NG0200 microtask-deferral are untouched — this migration only changes how a session starts.
- **`frontend/src/app/auth/account-page/`** — rewritten: a three-step flow (`'email' | 'signup' | 'otp'`) instead of the phone/OTP form. The email step's `404` response is what branches into the signup step — no separate "does this email exist" endpoint was needed.
- **Deleted `frontend/src/app/auth/complete-profile/`** entirely — obsolete now that signup collects name/age/mobile up front.
- **`frontend/src/app/home-page/`** — the `needsProfileCompletion` branch removed; back to unconditionally rendering the deposit/loan pages (the manager-redirect in `ngOnInit` is unchanged).

### Verified

- Backend: wrong/correct/expired/reused OTP all behave correctly; the orphan-row overwrite bug reproduced and confirmed fixed (see above); manager-role resync confirmed on both signup-verify and returning-login-verify paths; `BREVO_API_KEY` empty → clean `500` on every OTP-sending endpoint.
- Frontend (Playwright): no phone/Firebase UI remnants; a fresh email reaches the signup step (`404` path) and signup correctly stages `pending_*` without touching real fields; since Brevo isn't configured in this dev sandbox, `/auth/request-otp` was mocked to succeed for one test (its own logic was already verified directly against the backend) while `/auth/verify-otp` hit the real backend end-to-end — wrong code rejected with the right message, correct code logged in, navigated correctly, and copied `pending_*` into the real profile fields. Zero console errors beyond the expected failed-request lines, clean `ng build`.
- **Verified in production (2026-11-05):** real Brevo email delivery end-to-end on the live Render deployment — signup → OTP email received → verified → signed in.

### Security notes (demo-only — fix before any real deployment)

- `SECRET_KEY` in `auth.py` is read from the `SECRET_KEY` env var (auto-generated on Render by `render.yaml`); the hardcoded fallback `bankapp-dev-secret-change-me` is only for local dev.
- The Brevo API key is a real, powerful credential (can send email as the verified sender) and must stay server-side only — never add it to any frontend file.
- `SUPER_MANAGER_EMAILS` and the branch emails are plaintext in source files — fine for a demo, a real deployment would want these in a DB table with an admin screen.
- OTP rate limiting exists per-account (5 attempts, 10-minute expiry) but there's no limit on how often `request-otp`/`signup` can be called for a given email — someone could spam a mailbox with codes. Fine for a demo; a real deployment would want a cooldown between sends.
- An email inbox is now effectively a bearer credential for account access (whoever can read the OTP controls the account) — standard for any OTP-based system, but worth remembering if an email account is ever compromised.

## Older history

### Firebase phone-OTP era (2026-11-03 through 2026-11-04, superseded above)

This app briefly used mobile-number + OTP via Firebase Phone Auth. Kept for context; `/auth/firebase`, `/auth/complete-profile`, `frontend/.../firebase-config.ts`, and the `#recaptcha-container` div are all gone now.

**How it worked, briefly:** the frontend used Firebase's JS SDK (`signInWithPhoneNumber` + an invisible `RecaptchaVerifier`) to send/verify the actual SMS; the resulting Firebase ID token was verified server-side via `google-auth`'s `id_token.verify_firebase_token` against a `FIREBASE_PROJECT_ID`; the verified `phone_number` claim looked up/created a `User` by mobile number. First-time customers filled in full name/age/**email** (collected *after* phone verification, the opposite order of the current email-OTP system) via a "complete your profile" step.

**Why it was replaced:** the user wanted sign-in with any email provider, not tied to a phone number or a specific OTP vendor — see the 2026-11-05 migration above. The reordering of "collect details" vs. "verify" (details-then-verify now, vs. verify-then-details in every prior era) is also what surfaced the unverified-row overwrite bug described above — that exact bug couldn't have occurred in the old verify-first ordering, since nothing was ever written to a profile field before a third party had already vouched for the user's identity.

### Google Sign-In era (2026-09-23 through 2026-11-02, superseded above)

From 2026-09-23 to 2026-11-02 this app used Google Sign-In. Kept for context; `/auth/google`, `backend/google_config.py`, `frontend/.../google-client-id.ts` and `google-identity.d.ts` are all gone now.

**How it worked, briefly:** `index.html` loaded Google's Identity Services script; `account-page` rendered Google's own Sign-In button; clicking it produced a signed ID token (`credential`) containing the user's verified email/name/Google `sub`; the backend verified it via `google-auth`'s `id_token.verify_oauth2_token` against a `GOOGLE_CLIENT_ID`, looked up/created a `User` by email, and decided `role` from the same `MANAGER_EMAILS` allowlist used today. First-time customers filled in age + mobile via the same "complete your profile" pattern the Firebase era also used.

### Password-auth era (2026-09-04 through 2026-09-22, superseded above)

The original username/password system (`/auth/register`, `/auth/login`, a seeded `12345`/`12345` manager account). Fully removed as of the Google Sign-In migration on 2026-09-23. Debugging lessons from that era that still generalize to this app:

- **Known issue (historical): don't use `passlib` for bcrypt hashing.** `passlib[bcrypt]` 1.7.4's backend detection reads `bcrypt.__about__.__version__`, removed in `bcrypt` ≥ 4.0, breaking every hash/verify call. Moot now (OTP systems have no passwords to hash), but worth remembering if password auth is ever reintroduced.
- **Bug fixed (historical): "Register is not working"** turned out to be (1) CORS only allowing `http://localhost:4200` and (2) a register form with no inline per-field validation, so an invalid field silently blocked submission with zero visible error. **Lesson that still applies:** any reactive form in this app must render inline per-field errors, not just a submit-time banner.
- **Bug fixed (historical): manager dashboard visible without a real login.** A token restored from `localStorage` was trusted unconditionally, with no server-side check. Fixed by adding `GET /auth/me` and having `AuthService` re-verify any restored token before trusting it, gating the whole app behind a `verifying`/`whenReady()` signal. **This design is preserved unchanged through every later auth migration** — it re-verifies via `/auth/me` regardless of how the token was originally obtained.
- Two Angular pitfalls from that fix, still relevant to any future async-guard/service work: **`NG0203`** (an async route guard called `inject(Router)` *after* an `await`) and **`NG0200`** (a service's constructor called `http.get()` synchronously through an interceptor that tried to `inject()` that same still-constructing service).
- **Debugging note that generalizes well beyond any one change, and recurred repeatedly across every migration in this app:** a backend change can appear to have "no effect" even after a clean edit and a logged `uvicorn --reload` reload, because a second, orphaned `uvicorn`/`python` process from an earlier session is still alive and still holding port 8000 — only one process can actually own a listening socket on Windows. **Always check for a duplicate process (`Get-NetTCPConnection -LocalPort 8000` on Windows) before assuming a "no effect" change means the code is wrong.** This exact issue recurred during the email-OTP migration too (twice) — it is evidently a persistent habit of this dev environment, not a one-off.

## Open items

- No cooldown/rate-limit on how often `request-otp`/`signup` can be called for one email.
- No "my applications" view for a logged-in customer to see their own submission history (only the manager can currently list applications). Add if requested.
- `SUPER_MANAGER_EMAILS` and branch emails live in plain Python files — fine for a demo, would move to a DB table for anything real.
- Branch coordinates are approximate (town centres). Replace with real map pins when the bank provides them (see docs/branches.md).
- Customers can't change their branch; pre-branch customers stay under "No branch selected" until a super manager can fix it (no admin edit screen yet).
- Someone must be able to read the `@dccbvzm.org` inboxes for branch managers to sign in; untested whether that mail system accepts Brevo's emails.
- The manager table shows every customer, unpaginated — fine at demo scale, would need pagination for a real customer base.
- A real account (`saranravali@gmail.com`, row id 11) had its `full_name`/`age`/`mobile` overwritten by a test `signup()` call before the bug above was found and fixed. If that row was in the Render database, it no longer matters: the production database was recreated empty on 2026-11-05 (free-tier expiry; see docs/deployment.md) and every account re-registers. If it was in a local `bankapp.db`, its correct values still need restoring by the account owner.
