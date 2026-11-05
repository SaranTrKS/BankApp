# Kiosk Mode — Spec

A login-free, touch-only version of the site for a touchscreen standing in a branch. Built 2026-11-05. Only the **Head Office (branch 201)** has a kiosk for now.

- **URL:** `https://dccb-vzm-bank.vercel.app/kiosk` (locally `http://localhost:4200/kiosk`)
- **Screen:** portrait, designed for 1080×1920. Works on smaller portrait screens, but tap targets assume a large display.
- **No sign-in anywhere.** Visitors explore deposits, loans, the children's scheme and branches, and can leave their name and mobile for a call back.

## What the visitor sees

| Screen | What it does |
|---|---|
| Welcome ("attract") | Animated logo + "Touch the screen to begin". Shown at start and after every reset. |
| Home | 4 tiles (Deposits, Loans, Children's Savings, Our Branches) + Request a call back + Continue on your phone + About the bank. |
| Deposits | The same 8 schemes as the main site. Pick one → big number pad for the amount (plus quick-pick chips), age group (Below 60 / Senior 60+ / Super Senior 80+), period chips for the Term Deposit ladder, live chart, "You will get ₹…". "I'm interested — call me" (sticky at the bottom) opens the call-back form with the scheme and amount filled in. |
| Loans | The 8 loan categories with an icon and a one-line description, each with "Call me about this". No rates (the bank doesn't publish them). |
| Children's Savings | Bala Bhavishyath Nidhi: monthly-deposit chips (₹1,000–₹10,000), 3-stage chart, final maturity. |
| Our Branches | All 25, Head Office first ("You are here"), then nearest first by straight-line distance. Tap one → a QR code that opens it in Google Maps on the visitor's phone. |
| Request a call back | Name (on-screen A–Z keyboard), mobile (number pad, max 10 digits), topic if not already known, consent tick box. Then "Thank you" for 8 s and the kiosk resets itself. |
| Continue on your phone | QR code for the main site, where the visitor can sign in and actually apply. |
| About the bank | Name, "Since 1916", 25 branches, Head Office. **Address/phone/hours are deliberately left blank** until the bank provides them. |

Telugu appears next to English on headings, buttons, the consent line and key messages. **All Telugu text is a first draft and has not been reviewed** — it all lives in `frontend/src/app/kiosk/kiosk-text.ts` so a Telugu speaker can check it in one place.

## Kiosk behaviour

- **Automatic reset:** after 80 s without a touch, an "Are you still there?" countdown appears; at 90 s the kiosk goes back to the welcome screen. Any touch dismisses the countdown. Values in `kiosk.config.ts` (`IDLE_WARNING_MS`, `IDLE_RESET_MS`, `THANK_YOU_MS`).
- **Nothing carries over between visitors.** Every screen lives inside one `@switch` in `KioskPage`; going back to the welcome screen destroys them, which wipes anything typed. Verified: a name typed before an idle reset is gone afterwards.
- **No links.** A tapped link would navigate the kiosk browser away. Anything that points elsewhere (Google Maps, the main site) is a **QR code** for the visitor's own phone. Verified: zero `<a>` elements on every kiosk screen.
- **Touch hardening:** no text selection, no long-press context menu, no double-tap zoom (`touch-action: manipulation`).
- **No main-site chrome:** `App` hides the green header and the Sign-in panel on `/kiosk` and doesn't wait for a session check.
- **Lazy-loaded:** the kiosk (≈20 kB gzipped, plus the QR library) is a separate chunk, so the main site doesn't download it.
- **Number pad / keyboard:** both emit key presses; the parent applies them to its own signal (`applyPadKey` / `applyLetterKey`), so fast taps can't build on a stale value and lose a character.
- **Same numbers as the main site:** deposit maths comes from `buildSchemeGrowthSeries()` in `deposit-schemes/calculators.ts`, shared with the main site's scheme cards. Verified: MNSN 333 Days at ₹1,00,000 shows the same maturity in both.

## Call-back requests

**Backend** (`backend/main.py`, model `CallbackRequest`, table `callback_requests` — created automatically on startup):

- `POST /callback-requests` — **public**, no login. Body: `full_name`, `mobile` (Indian 10-digit, starts 6–9), `interest_type` (`deposit` | `loan` | `general`), optional `interest_ref` / `interest_label` / `amount`, `branch_code`, `consent` (must be true), `website` (honeypot). Always stored with `source="kiosk"`, `status="new"`.
- `GET /manager/callback-requests[?status=new|contacted]` — managers only. **Branch-scoped server-side**: a branch manager sees only their branch; super managers see all. Head Office requests are therefore seen by the three super managers only.
- `PATCH /manager/callback-requests/{id}` `{status: "new" | "contacted"}` — records `contacted_at` and who did it; "Re-open" clears them. Another branch's request returns **404** (not 403), so its existence isn't revealed.

**Spam protection** (the form has no login):
- Honeypot field `website`, invisible and unreachable by touch; if filled, the API replies "received" and stores nothing.
- Validation: name 2–120 chars, valid mobile, consent required, known branch, amount > 0.
- Max **3 requests per mobile number per 24 h** (DB check) → `429` with a friendly message.
- Max **60 requests per hour per IP** (in-memory, uses `X-Forwarded-For` behind Render's proxy). Generous because every kiosk request comes from the kiosk's own IP. It resets when the backend restarts; a real deployment would use Redis or similar.

**Privacy:** the mobile number is **not verified** (no SMS provider) — the dashboard labels every number "unverified". The kiosk shows "We use your name and number only to call you about this enquiry." Requests are kept until deleted; there's no automatic clean-up yet — the bank should decide a retention period (India's DPDP Act).

**Dashboard:** `/manager` now has two tabs, **Customers** and **Call-back requests**. The second shows a red "N new" badge, New / Contacted / All filters, name, mobile (+ "unverified"), what they were interested in, amount, branch (super managers only), and Mark contacted / Re-open.

## Setting up the kiosk machine

Run Chrome (or Edge) in kiosk mode pointed at the kiosk URL, e.g. on Windows:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk https://dccb-vzm-bank.vercel.app/kiosk --disable-pinch --overscroll-history-navigation=0 --noerrdialogs --disable-translate
```

- `--kiosk` hides the address bar, tabs and window controls.
- `--disable-pinch` stops two-finger zoom; `--overscroll-history-navigation=0` stops swipe-to-go-back.
- Put this in the Windows Startup folder (or use Windows "Assigned Access") so it starts on boot.
- Set the screen to **portrait** in Windows display settings.
- Render's free tier sleeps when idle, so the first call-back of the day can take 30–60 s to reach the server. A paid Render plan avoids this.

## How to change things

- **Loan details from the bank:** edit `LOAN_DISPLAY` in `frontend/src/app/kiosk/kiosk-loans/kiosk-loans.ts` (icon + one-line description; currently generic placeholders). Loan names come from `LOAN_TYPES` in `loan-application/models.ts`, shared with the main site.
- **Head Office contact details:** `frontend/src/app/kiosk/kiosk-about/kiosk-about.ts`.
- **Telugu text:** `frontend/src/app/kiosk/kiosk-text.ts`.
- **A kiosk at another branch:** today `KIOSK_BRANCH_CODE = 201` in `kiosk.config.ts`. A second kiosk would need the branch to come from the URL (e.g. `/kiosk/208`) instead; the backend already scopes call-backs by branch, so that branch's manager would see them automatically.
- **Timings:** `kiosk.config.ts`.
- **Styles:** shared look in `kiosk/_kiosk.scss` (colours, glass card, buttons). Kiosk component styles are larger than the main site's, so `angular.json`'s `anyComponentStyle` budget was raised to 8 kB warning / 12 kB error.

## Verified (2026-11-05)

- **Backend, 29 checks:** public submit; validation (consent, mobile, name, topic, branch, amount); honeypot stores nothing; 4th request from one mobile in a day → 429; branch manager sees only their branch; super sees all; customers 403, anonymous 401; other branch's PATCH → 404; contacted/re-open; status filters. The 30 branch-feature checks still pass.
- **Browser, 51 checks** (Chromium, 1080×1920): no site header/Sign-in on `/kiosk`; home tiles; 8 deposit schemes; below-minimum note; senior rate higher; ladder chips change rate; kiosk and main site agree on MNSN-333; call-back prefilled from deposits and loans; validation messages; keyboard title-cases names; mobile pad stops at 10 digits; thank-you then automatic reset; 25 branches with H.O first and 216 "Same town"; branch and phone QR codes; About shows no invented details; no links on any screen; idle warning at 80 s, dismiss, reset at 90 s and data wiped; super manager badge, rows, unverified label, mark contacted, contacted list; branch manager doesn't see H.O requests; no console errors. Clean `ng build`.
- **Not verified:** a real touchscreen, real phones scanning the QR codes, and the Telugu wording.

## Open items

- Telugu review by a native speaker.
- Real loan details, Head Office address/phone/hours from the bank.
- Retention period / clean-up for call-back requests.
- Exact branch map pins (QR maps currently open the town centre; see docs/branches.md).
