# Authentication & Manager Dashboard — Spec

> **2026-11-05: auth was migrated from phone OTP (Firebase) to email OTP (any provider, via Brevo).** Everything below the "Change (2026-11-05): migrated to email OTP via Brevo" section describes the **current** system. The sections above it describe three earlier systems (password-based, Google Sign-In, then Firebase phone OTP) for historical context — the specific endpoints/files they mention (`/auth/register`, `/auth/login`, `/auth/google`, `/auth/firebase`, `/auth/complete-profile`, `backend/google_config.py`, `frontend/.../firebase-config.ts`, the seeded `12345`/`12345` account) **no longer exist**, but the debugging lessons in them still apply to this app generally.

## What this feature does

- Visitors sign in with **any email address** — Gmail, Outlook, a work email, anything. Enter it, get a 6-digit code emailed to you, enter the code, done.
- If the email has never been seen before, a short signup step (full name, age, mobile) runs first — then the same code-by-email step verifies it and creates the account.
- Whether someone becomes a **customer** or a **manager** is decided by their email against an allowlist in `backend/manager_config.py` — editable by whoever runs this app, no code change or migration needed. Anyone not on the list is a customer.
- A manager gets a genuinely **separate page** (route `/manager`, not just a dropdown mixed into the customer page) listing **every** registered customer, with age/mobile/email and any loans/deposits they've applied for, expandable per customer.
- Regular customers cannot see the manager page or other users' applications (route-guarded client-side, and 403'd server-side).

## Change (2026-11-05): migrated to email OTP via Brevo, Firebase phone auth removed

**Why:** the user wanted sign-in to work with *any* email address, not just a phone number — "they don't have to be Gmail... login with an OTP sent to their mail if registered, if not registered then they should signup, give their details, then verify their mail." That ordering (collect details, *then* verify) is the opposite of every prior migration in this app, where verification came first (via a third party) and missing details were collected afterward.

**Decisions confirmed with the user before building this:**
1. Email OTP becomes the *only* way to log in — Firebase phone auth is fully removed (not kept as an alternative).
2. Email is sent via **Brevo**'s HTTP API rather than raw SMTP — chosen over SMTP-via-an-existing-mailbox (e.g. Gmail + an app password) for better deliverability and because it needed no new backend dependency (`requests`, already installed) versus SMTP's own set of gotchas (ports, TLS, provider sending limits). Chosen over Firebase/other phone-style providers because the whole point of this migration is "any email provider," which an email-OTP system handles natively — there's no analogous "any provider" phone OTP without picking a specific SMS gateway.
3. Manager assignment **stays keyed by email** — unchanged in spirit from the Google/Firebase eras, just now the same field is *also* the login identity.

### How it works

**Two ways into the same verification step:**
- **Returning user:** enters their email → `POST /auth/request-otp {email}` → backend finds an existing `User` row, generates an OTP, emails it. A `404` here (no such account) tells the frontend to show the signup form instead.
- **New user:** after the `404`, fills in full name/age/mobile → `POST /auth/signup {full_name, age, mobile, email}` → backend creates the row (or reuses an unverified one from an abandoned earlier attempt — see the bug below) and sends the OTP the same way.
- **Both converge on:** `POST /auth/verify-otp {email, otp}` → backend checks the code (hashed, time-limited, attempt-limited — see below) and, on success, issues our usual app JWT. This is the only endpoint that actually logs someone in; `request-otp`/`signup` only ever send a code.

**OTP mechanics** (`backend/main.py`): a 6-digit code (`secrets.randbelow`, not `random` — cryptographically unpredictable), SHA-256-hashed into `User.otp_hash` (plaintext OTPs are never stored), with a 10-minute expiry (`otp_expires_at`) and a 5-attempt cap (`otp_attempts`, incremented on each wrong guess, blocking further tries with a `429` once exhausted — a fresh `request-otp`/`signup` call resets it). On successful verification, `otp_hash`/`otp_expires_at`/`otp_attempts` are all cleared, so a code can't be replayed.

**Sending the email** (`backend/email_service.py`): a POST to `https://api.brevo.com/v3/smtp/email` with the API key in an `api-key` header and a `sender`/`to`/`subject`/`htmlContent` JSON body — Brevo's stable "send a transactional email" endpoint. No SDK, just `requests` (already a dependency from the Google Sign-In era).

**Manager role resync:** happens in `_resync_role()`, called both when an existing user's OTP is verified (in case `MANAGER_EMAILS` changed since they last logged in) and the first time a *new* signup's OTP is verified (since that's the first moment the email is confirmed real).

### A real bug caught and fixed while building this: unverified rows as an overwrite vector

First implementation: `signup()` looked up the email, and if it found an existing-but-unverified row (`email_verified == False`), it overwrote that row's `full_name`/`age`/`mobile` directly and resent an OTP — reasoning that an unverified row must mean an abandoned signup attempt, safe to retry over. **This was wrong**, and caused real damage: the new `email_verified` column defaults to `False` for *every pre-existing row*, including real accounts from the Google/Firebase eras that were never "unverified" in any meaningful sense — the column simply didn't exist before. A test `signup()` call against a real account's email silently overwrote its real `full_name`/`age`/`mobile` with test data, with no proof the caller controlled that inbox at all.

**Fix:** added `pending_full_name`/`pending_age`/`pending_mobile` columns. `signup()` now always writes to these *staging* columns, never directly to the real profile fields — regardless of whether the row is brand new or a retry over an existing-unverified one. `verify_otp()` only copies `pending_*` → the real fields (and clears `pending_*`) at the moment the OTP is actually confirmed. This closes the gap generally: nobody can mutate any account's real profile — new or existing — without first proving they received a code at that address. Verified by seeding a signup, confirming only the `pending_*` columns were set (not the real fields), then verifying the OTP and confirming the real fields updated and `pending_*` cleared.

**Lesson for this app:** a newly-added boolean column defaulting to `False` for historical rows is not the same claim as "this row was never verified" — code that branches on it needs to consider what it means for data that predates the column, not just data created after it.

### Required setup (not committed — see below)

- A free Brevo account (app.brevo.com) with an API key and one **verified sender** email address.
- `backend/manager_config.py` — `BREVO_API_KEY` (read from the `BREVO_API_KEY` env var; never hardcode it — GitHub push protection rejects commits containing it), `FROM_EMAIL` (the verified sender), `FROM_NAME`, and `MANAGER_EMAILS` (unchanged from prior eras).
- Until `BREVO_API_KEY`/`FROM_EMAIL` are filled in, every OTP-sending endpoint returns a clear `500` ("Email sign-in isn't configured yet…") instead of crashing — verified by testing with both empty.
- Unlike the Google Client ID or Firebase web config (both public-by-design, checkable client-side), **the Brevo API key must never reach the browser** — it's a real credential that can send email as the verified sender. There is deliberately no frontend config file for this migration; the frontend has no way to know ahead of time whether email sending is configured, and just surfaces the backend's `500` through its normal error banner like any other failure.

### Backend changes

- **`backend/models.py`** — added `email_verified` (bool, default `False`), `otp_hash`, `otp_expires_at`, `otp_attempts`, and the `pending_full_name`/`pending_age`/`pending_mobile` staging columns described above. `email` is now declared `unique=True` (app-level enforcement only, per this app's established non-destructive-migration policy — see below). `mobile`'s stray `unique=True` from the phone-OTP era was removed (it's a profile detail again, not the login identity). `google_sub`/`firebase_uid` are gone from the model entirely (unused across two superseded migrations) — the physical columns remain, harmlessly orphaned, in any database that already has them.
- **`backend/database.py`** — `run_migrations()` gained guarded `ALTER TABLE` steps for all six new columns.
- **`backend/manager_config.py`** — dropped `FIREBASE_PROJECT_ID`, added `BREVO_API_KEY`/`FROM_EMAIL`/`FROM_NAME`. `MANAGER_EMAILS` unchanged. (Filename unchanged from the phone-OTP era — it's generic enough to keep holding "whatever this app's current auth config is" without another rename.)
- **New `backend/email_service.py`** — `send_otp_email()`, the Brevo API call described above.
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
- **Not verified end-to-end**: the actual Brevo email delivery, which needs a real account/API key/verified sender only the person running this app can create.

### Security notes (demo-only — fix before any real deployment)

- `SECRET_KEY` in `auth.py` is still a hardcoded string — unchanged by this migration, still signs our own JWTs.
- The Brevo API key is a real, powerful credential (can send email as the verified sender) and must stay server-side only — never add it to any frontend file.
- `MANAGER_EMAILS` is still a plaintext list in a source file — fine for a demo, a real deployment would want this in an environment variable or a DB table.
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

- Real Brevo email delivery is untested end-to-end — see "Verified" above.
- No cooldown/rate-limit on how often `request-otp`/`signup` can be called for one email.
- No "my applications" view for a logged-in customer to see their own submission history (only the manager can currently list applications). Add if requested.
- `MANAGER_EMAILS` lives in a plain Python file — fine for a demo, would move to an environment variable or DB table for anything real.
- The manager table shows every customer, unpaginated — fine at demo scale, would need pagination for a real customer base.
- A real production account (`saranravali@gmail.com`, row id 11) had its `full_name`/`age`/`mobile` overwritten by a test `signup()` call before the bug above was found and fixed. The correct values still need to be supplied by the account owner and restored — flagged to the user, unresolved as of this writing.
