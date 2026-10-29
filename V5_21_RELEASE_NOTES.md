# Career Buddy V5.21 — Focused Career Discovery

## What changes

The previous 13-question questionnaire is replaced with **seven essential questions** and **one conditional eighth question**. A user with a named target role answers seven; someone who enters **Still exploring**, **Not sure**, or an equivalent undecided response answers eight, including career fields of interest. The work-style and change-comfort questions are removed. The previous career-situation, career-goal and career-values questions are consolidated into one top-three priorities question.

The questionnaire now asks, in this order:

1. **Career stage** — choose one.
2. **Target career role/direction** — short text, or Still exploring.
3. **Top career priorities (2–3 years)** — select up to 3.
4. **Career interest fields** — select up to 3; shown **only if still exploring**.
5. **Top strengths or skills** — select up to 3; optional text for tools, certifications or one practical example.
6. **Highest education/qualification** — choose one.
7. **Biggest barriers** — select up to 3 (No major barrier is exclusive).
8. **Weekly learning time** — choose one.

All multi-select questions allow 1–3 selections. Wherever Other is selected, an explanatory text field is required. The optional practical example has basic nonsense validation. Previous/Back retains its no-AI-cost behaviour and restores previous entries for editing.

## Free-report design

The report separates the user’s chosen goal and strengths from confirmed abilities. It now contains:

1. **Career direction and starting point** — target, relevant role/field competencies and user-reported strengths/tools.
2. **Transferable advantage** — a grounded connection between existing strengths and target.
3. **Career opportunities worth exploring** — 2–3 pathways with an explanation, tied to the user’s answers.
4. **Career alignment** — qualitative interpretation, including known barriers and self-reported exposure.
5. **Two highest-impact next moves** — practical actions adapted to learning time and barriers.
6. **What a deeper assessment could reveal** — limitations and Premium option *only at the bottom*.

The **same `OPENAI_MODEL` setting** is used for the free report; no new calls during answering or Back. A single personalised AI call at snapshot generation now has a slightly higher response-token allowance to cover career pathways, so final cost depends on actual token usage. Shared role-only guidance remains cached; private user details are not written to the cache. The free report does not assert verified skill levels or give false career-readiness scores.

## Compatibility and deployment

- **Existing completed free reports and purchases remain untouched.**
- **Incomplete V5.20-or-earlier questionnaires restart with V5.21** to avoid joining incompatible answer sets. This is reflected in the returned state and persisted on the next answer. Verified sessions and purchase records are preserved.
- The one-browser free restriction remains disabled by default for testing (`ENFORCE_FREE_BROWSER_LIMIT=0` or unset).
- Existing public URL, Razorpay credentials/webhook, coupons, pricing, credits and paid assessment code remain unchanged.
- No new environment variables are required. Do not update the main website or old Professionals repository.

## QA

- 134 tests passed, 11 older historical tests skipped, 0 failed. The V5.19 13-question-specific assertions are archived under `tests/legacy-v519` and replaced by current V5.21 tests.
- Both 7-question and 8-question flows completed against the actual API handler using simulated Firestore and a cached role guidance response; a forced model outage produced a conservative fallback report.
- UI checked at 1280px, 390px and 320px without horizontal scrolling, including Other and optional-strengths inputs.
- No live Firebase, Razorpay charge or OpenAI call was performed. Verify after deploying to Vercel Production.

**Deploy**: extract the ZIP contents into `aiearlycareerguide-career-buddy` and redeploy Vercel Production. Then test with a verified account; a partially completed older intake will restart. The free snapshot is generated only once per account; use a fresh account or your existing approved owner-reset process to test it repeatedly.
