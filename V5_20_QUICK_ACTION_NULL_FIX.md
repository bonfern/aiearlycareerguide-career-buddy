# Career Buddy V5.20 — Free Questionnaire / `quick` Null Crash Fix

## What failed

With `ENFORCE_FREE_BROWSER_LIMIT` disabled (the V5.18/V5.19 testing default), the server intentionally does not create or load a browser claim (`bRef` and `bSnap` are `null`). The `quick` handler unconditionally called `bSnap.data()`, causing a 500 TypeError before saving the submitted answer. `freeReport` used the same unsafe access. This is a confirmed code defect. The screenshot's truncated stack cannot independently establish whether there were any additional errors.

## Fix

- Added `browserClaimFromSnapshot()` to safely read an optional browser-claim snapshot.
- Applied it in both `quick` (free answers, including Q13) and `freeReport` (snapshot generation).
- Kept browser restrictions disabled unless explicitly configured with `ENFORCE_FREE_BROWSER_LIMIT=1`.
- Preserved the existing restriction and ownership checks when re-enabled.
- Preserved all 13 question texts and order, including the required Q13 target career goal or role, and the same free-report and paid billing logic.
- Added regression coverage for absent snapshots and checking both server paths.

## Deploy

1. Upload the extracted V5.20 ZIP **contents** to the **aiearlycareerguide-career-buddy** GitHub repository.
2. Confirm Vercel deploys to Production.
3. Leave `ENFORCE_FREE_BROWSER_LIMIT` unset or `0` for testing. No other environment variables need modification.
4. Return to `https://www.aiearlycareerguide.com/professionals/`, sign in with the **same verified email**, and continue the saved free questionnaire. Existing saved answers and previous reports are not deleted.
5. Submit the current question, complete Q13, generate the free snapshot and download PDF. Verify that no new `action:'quick'` TypeError appears in the Production logs.

## Validation

`npm test` — 137 passed, 0 failed, 11 skipped legacy tests. `node --check` passed for changed JavaScript files. These are local checks. No real Vercel/Firebase request was made from this environment.

## Security / scope

- No changes to Razorpay, coupon rules, OpenAI selection, sign-in sessions, eligibility, credits or production secrets.
- The browser restriction was previously disabled intentionally for QA; it can be re-enabled later. Enabling it may require an appropriate browser identity and existing-claim handling.
