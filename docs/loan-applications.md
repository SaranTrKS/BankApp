# Loan Applications — Spec & Research

## Research: DCC Bank loan schemes (2026-09-04)

The official **Vizianagaram DCCB site** (vizianagaramdccb.bank.in) confirms four loan category pages — **Home, Gold, Personal, and Other/Agricultural loans** — plus mentions of Vehicle and Education loans, but **publishes no interest rates, amounts, tenure, or eligibility numbers** on any of those pages (all four sub-pages were checked directly).

Since Vizianagaram doesn't publish specifics, sibling AP DCCBs (same cooperative-bank structure) were checked as a reference for what a DCCB loan menu typically contains:

- **Srikakulam DCCB**: Agriculture loans (9.85–11.80%), Gold loans (8.00–9.50%, tiered by amount), Housing (9.50–11.50%), Vehicle (8.00–9.50%), Education (10%), Personal (12%), plus government-sponsored schemes (PM Awas Yojana, PM Mudra, PM Svanidhi) and group-lending products (JLG, SHG).
- **Visakhapatnam DCCB**: 26 named products spanning crop loans, tiered gold loans, SHG/JLG loans, housing, personal (salary-account based), house-site loans, and state schemes like Fish Andhra.
- Third-party rate aggregators put Vizianagaram DCCB's own personal loan rate starting around **9.75%** (unverified against the bank's own site).

**Conclusion used for this app:** loan-type categories are consistent across DCCBs, but exact rate/amount/tenure numbers for Vizianagaram specifically are not published anywhere. This app therefore only **collects loan applications** (an intake form) — it does not quote or calculate an interest rate for loans, unlike the deposit calculator. Confirm real numbers with the branch before using this for anything beyond a demo.

Sources: vizianagaramdccb.bank.in (and its /home-loans, /gold-loans, /personal-loans, /other-loans pages), dccb-srikakulam.org/loans.php, visakhapatnamdccb.bank.in/Loan-Schemes, codeforbanks.com's Vizianagaram DCCB personal loan rate page.

## Loan type categories used in the form

`agriculture`, `gold`, `personal`, `home`, `vehicle`, `education`, `business` (MSME), `shg` (Self Help Group) — defined in `frontend/src/app/loan-application/models.ts` as `LOAN_TYPES`.

## Implementation status (2026-09-04)

- **Backend**: `models.LoanApplication` (table `loan_applications`) — `full_name`, `mobile`, `email`, `loan_type`, `amount`, `tenure_months`, `purpose`, `address`, plus `user_id` (FK to `users`, added once auth was introduced — see [docs/auth-and-manager.md](auth-and-manager.md)). `POST /loan-applications` requires a logged-in user (any role) and attaches `user_id` from the JWT. `GET /loan-applications` requires the `manager` role (403 otherwise).
- **Frontend**: `frontend/src/app/loan-application/` — `loan-application-page/` renders the "Apply for a Loan" dropdown with a reactive form (full name, mobile, email, loan type, amount, tenure, purpose, address). If the visitor isn't logged in, the panel shows a "please log in" prompt instead of the form (the real enforcement is server-side; this is just UX).
- **Verification**: registered a test customer, submitted a loan application while logged in, confirmed a 403 when a non-manager tried to list applications, and confirmed the manager account could see it via `GET /loan-applications` and in the Manager Dashboard's "Loan Applications" tab. No console errors in a full Playwright run.

## Open items

- Vizianagaram DCCB's real loan interest rates/amounts/eligibility are still unknown — this form intentionally does not compute or display a rate.
- No loan status/workflow (approved/rejected) exists yet — applications are just recorded and listed for the manager. Add if requested.
