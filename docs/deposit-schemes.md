# Deposit Scheme Calculator — Spec

Source: DCCB-VZM (District Co-operative Central Bank, Vizianagaram) promotional poster, provided by the user on 2026-09-04. Extracted by reading the image directly — no OCR file exists, so if rates ever need re-checking, ask the user for the poster image again.

Bank contact: 9989773037. Branch: Vizianagaram.

## Extracted interest rate table (ROI %, per annum)

| Product | Normal Public | Senior Citizens (60+, +0.60%) | Super Sr. Citizens (80+, +0.75%) |
|---|---|---|---|
| MNSN Deposit – 333 Days | 7.00 | 7.60 | 7.75 |
| MNSN Deposit – 666 Days | 8.10 | 8.70 | 8.85 |
| Double Plus Deposit | 8.10 | 8.10 | 8.10 |
| RD BB Nidhi | 7.31 | – | – |
| SPL RD – 1 Year | 7.25 | 7.85 | 8.00 |
| SPL RD – 2 Years | 7.50 | 8.10 | 8.25 |
| SPL RD – 3 Years | 8.00 | 8.60 | 8.75 |
| 7 to 30 Days | 3.75 | 4.35 | 4.50 |
| 31 to 45 Days | 3.75 | 4.35 | 4.50 |
| 46 to 90 Days | 4.50 | 5.10 | 5.25 |
| 91 to 179 Days | 4.75 | 5.35 | 5.50 |
| 180 to 270 Days | 6.00 | 6.60 | 6.75 |
| 271 to 364 Days | 6.00 | 6.60 | 6.75 |
| 1 to 2 Years | 7.00 | 7.60 | 7.75 |
| 2 to 3 Years | 7.25 | 7.85 | 8.00 |
| 3 to 5 Years | 7.90 | 8.50 | 8.65 |
| 5 Years and Above | 7.25 | 7.85 | 8.00 |
| Savings Deposit Account | 3.00 (flat, all customer types) | — | — |

## Scheme categories & how each is modeled

1. **Standard Term Deposit ladder** (7 days → 5+ years): one-time lump-sum FD. One UI card with **two sliders** — deposit amount and tenure (7 days to 10 years) — rate auto-selected from whichever slab the tenure slider lands in. (Originally amount was fixed/uneditable on this card only; changed 2026-09-05 to match every other card having an amount slider — see Implementation status.)
2. **MNSN Deposit (333 / 666 days)**: fixed-tenure special/festival scheme, two discrete products. Tenure is NOT slider-controlled (only two fixed values exist) — rendered as two cards (or a toggle between the two), each with an **amount slider** driving the maturity value.
3. **Double Plus Deposit**: rate is identical (8.10%) across all customer types → modeled as a "doubling" product with one fixed tenure computed from the rate (principal doubles at maturity). **Amount slider** only; tenure is fixed and shown as a label.
4. **RD BB Nidhi** and **SPL RD (1/2/3 yr)**: Recurring Deposit — monthly installments, not lump sum. Tenure fixed by product name (RD BB Nidhi's exact tenure isn't printed on the poster — treat as open/undefined tenure or ask user before implementing; SPL RD tenures are 1/2/3 years). **Amount slider** = monthly installment amount. Senior-citizen bonus does NOT apply to RD BB Nidhi (poster shows "–").
5. **Savings Deposit Account**: flat 3% p.a. simple interest on balance, not a term product. Static info card — no slider, or at most a balance slider with a simple-interest line, no maturity/lock-in concept.

## Confirmed calculation formulas

- **FD (lump sum) — quarterly compounding** (confirmed default for this app):
  `A = P × (1 + r/4)^(4×t)`  where `r` = annual rate as decimal, `t` = years (fractional allowed).
- **Double Plus Deposit tenure** (derived, not printed on poster): solve `t` where `A = 2P` at r = 8.10% quarterly compounding:
  `t = ln(2) / (4 × ln(1 + 0.081/4))` ≈ **8.645 years** (~8 years 8 months).
- **RD (recurring deposit) maturity value**, monthly installments, quarterly-compounded rate (standard Indian bank RD formula):
  `M = R × [ (1+i)^n − 1 ] / [ 1 − (1+i)^(−1/3) ]`
  where `R` = monthly installment, `i` = r/4 (quarterly rate), `n` = number of quarters the deposit spans (fractional handling: apply the standard bank convention of compounding quarterly and crediting proportionally for partial quarters — implement with the simpler monthly-compounding approximation if the exact bank convention isn't critical for a demo: `M = R × [(1+i_m)^n_m − 1] / i_m × (1+i_m)` where `i_m = r/12`, `n_m` = number of months).
- **Savings account**: simple interest, `I = P × r × t`, typically credited quarterly/half-yearly in real banks but shown here as a simple continuous line for illustration.

## UI/UX decisions

- **Landing page**: DCCB-VZM logo + green theme (dark green primary `#1b5e20`-ish, light green accents, cream/white background) matching the poster.
- **Interaction model**: a dropdown ("Deposit Schemes") expands into a **2-row grid of scheme cards**. Each card has a slider (time for the standard ladder, amount for fixed-tenure products) and an animated chart (Chart.js line chart) that redraws/animates as the slider moves, x-axis = time, y-axis = ₹ value.
- Each card also has a **customer-type toggle**: Normal / Senior Citizen (60+) / Super Senior Citizen (80+), which swaps the rate used in the calculation (not applicable to RD BB Nidhi or Savings).
- **Responsive**: mobile-first, 2-row grid collapses to a single column under ~600px width.

## Implementation status (2026-09-04)

Built and verified. Files:
- `frontend/src/app/deposit-schemes/models.ts` — `DepositScheme`, `RateSlab`, `CustomerType`, `GrowthPoint` types
- `frontend/src/app/deposit-schemes/calculators.ts` — `fdMaturity`, `rdMaturity`, `doublingTenureYears`, `buildFdGrowthSeries`, `buildFdLadderGrowthSeries`, `buildRdGrowthSeries`, `buildFlatGrowthSeries`, `formatInr`, `formatTenure`
- `frontend/src/app/deposit-schemes/deposit-schemes.data.ts` — all 9 products from the rate table above, as `DEPOSIT_SCHEMES`
- `frontend/src/app/deposit-schemes/chart-line/` — Chart.js line chart wrapper (`ChartLine`), redraws with 500ms ease-out animation on input change
- `frontend/src/app/deposit-schemes/scheme-card/` — one card per scheme: customer-type toggle chips (hidden when `supportsCustomerType` is false), a single range-input slider (tenure for `FD_LADDER`, amount/installment otherwise), rate line, chart, maturity value; all reactive via Angular signals + `computed()`
- `frontend/src/app/deposit-schemes/deposit-schemes-page/` — the "Deposit Schemes" dropdown (default open) wrapping a responsive grid (`repeat(3, 1fr)` → 2 → 1 column under 900px/600px)
- Wired into `app.ts`/`app.html`/`app.scss` with the DCCB-VZM header (inline SVG placeholder logo — poster's real logo art was not extracted as an asset) and the green theme tokens in `styles.scss` (`--primary: #2e7d32`, `--primary-dark: #1b5e20`, etc.)

**Verification performed:** `ng build` clean; headless Playwright script (`chromium.launch()` + navigate to `ng serve` on :4200) confirmed: page renders header/logo, dropdown expands to all 9 cards, moving a slider changes the chart and maturity value, clicking the Senior chip changes the displayed rate (verified 6% → 6.6% on a 180-270 day slab) and recomputes maturity value, zero `console.error`/`pageerror` events. Visual screenshot reviewed and matches the intended green theme/layout.

**Known UX note:** the `FD_LADDER` (Term Deposit) card's tenure slider defaults to 365 days (not min or max) so sliding either direction visibly changes the value — this was a deliberate fix after the first test run showed no visible change when initialized at max.

## Change (2026-09-05): "RD BB Nidhi" replaced with the real "Bala Bhavishyath Nidhi" children's scheme

The original `rd-bb-nidhi` entry in `DEPOSIT_SCHEMES` was a guess (generic 1-year RD at 7.31%) made without source material for what "BB Nidhi" actually was. The user later supplied the actual DCCB-VZM poster for it: **Bala Bhavishyath Nidhi**, a children's savings product (ages 0–18) with a 21-year, 3-stage structure, not a simple 1-year RD. It has been removed from the generic scheme grid and rebuilt as its own dedicated component, since its shape doesn't fit the `DepositScheme` model (single calc type, single tenure) used by every other card.

**Real scheme structure (from the poster):**
- Monthly deposit ₹1,000–₹10,000, for children 0–18 years (primarily targeted at 0–6 years)
- **Stage 1 (years 1–7):** paid in as a Recurring Deposit — 84 monthly installments
- **Stage 2 (years 8–14):** the matured RD lump sum rolls into a 7-year CTD (cumulative/compound term deposit) — no new money added
- **Stage 3 (years 15–21):** that CTD auto-renews for another 7 years — maturity paid out after year 21
- Same rate throughout both RD and CTD phases: **7.31%**
- Poster's own illustration table gives exact Investment/Maturity figures for 4 premium tiers (₹1,000/2,000/5,000/10,000), which was used to **validate the formulas** (see the `rdMaturity` update below) — computed values landed within 0.01–0.02% of the poster's printed figures for every stage and every tier, confirming both the interest-rate convention and the compounding logic are right.

**Implementation** (`frontend/src/app/deposit-schemes/`):
- `calculators.ts` — `buildBalaBhavishyathStages(monthlyDeposit)` computes all 3 stages: RD maturity via `rdMaturity`, then two successive `fdMaturity` compounding passes (7 years = 2555 days each) since a CTD is just a lump-sum FD.
- `stage-bar-chart/` — a new Chart.js **grouped bar chart** component (Investment vs. Maturity per stage), chosen over the line/area charts used elsewhere because this scheme's value doesn't grow smoothly — it jumps at 3 discrete milestones, and a bar comparison mirrors the poster's own "Scheme Calculation (Illustration)" table far better than a smoothed curve would.
- `bala-bhavishyath-card/` — the dedicated full-width card: scheme facts (age range, deposit range, lock-in, maturity timing, rate), a monthly-deposit slider (₹1,000–₹10,000), the bar chart, an exact per-stage table (mirroring the poster), final maturity value, and the same "Apply for this Deposit" flow as other cards (`customer_type` sent as `'normal'` since this scheme has no senior-citizen tiers — it's a children's product).
- Rendered as its own section below the main 3-column grid in `deposit-schemes-page.html`, not inside it — visually and structurally separate since a uniform-card grid doesn't fit a 3-stage product.

**Side fix, discovered via this validation:** `rdMaturity()` previously used a monthly-compounding approximation that was ~0.2% off from real bank figures. Replaced with the standard quarterly-compounding RD formula (`i = r/4`, `quarters = months/3`), which matches the poster's numbers to ~0.04%. This also improves accuracy for the existing SPL RD 1/2/3-year cards, not just the new scheme.

## Change (2026-09-05): Term Deposit amount is now adjustable

The `FD_LADDER` (Term Deposit) card was the only scheme card without an amount slider — its principal was hardcoded to `scheme.defaultAmount` (₹1,00,000) with no way to change it. Added a "Deposit Amount" slider identical to the other cards, positioned above the existing tenure slider. `SchemeCard.growthPoints()` and `applicationAmount` now read `this.amount()` uniformly for all calc types instead of special-casing the ladder to `scheme.defaultAmount`. Verified via Playwright: sliding the amount from ₹1,00,000 to ₹1,50,000 changed the maturity value from ₹1,07,186 to ₹1,60,779 and redrew the chart, no console errors.

## Deposit applications (2026-09-04)

Each scheme card now has an **"Apply for this Deposit"** button. Clicking it requires the visitor to be logged in (see [docs/auth-and-manager.md](auth-and-manager.md)) and submits the card's *current* slider-derived state — `scheme_id`, `scheme_name`, `customer_type`, `amount`, `tenure_days`, and the already-computed `projected_value` — to `POST /deposit-applications`, stored in the `deposit_applications` table tied to the user's account. No separate form: the slider state the user already set is what gets submitted. These are visible to the bank manager in the Manager Dashboard's "Deposit Applications" tab. Logic lives in `frontend/src/app/deposit-schemes/deposit-application.service.ts` and the `onApply()` method on `SchemeCard`.

## Open items / things to double check with the user later

- Exact tenure for **RD BB Nidhi** isn't printed on the poster — currently unspecified in the data model; ask before finalizing its card, or leave tenure as a user-adjustable field.
- The RD formula's exact bank convention (quarterly vs monthly compounding basis) is approximated above — fine for a demo, but should be confirmed against DCCB's actual RD certificate math if this ever needs to match real payouts.
- No source file for the poster image exists in the repo; re-verify rates against the bank directly before using this for real customer-facing numbers.
