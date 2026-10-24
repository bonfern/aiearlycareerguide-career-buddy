# Career Buddy V5.8.1 — Firestore Stage-2 Persistence Hotfix + Razorpay Test Mode

**A separate application for private testing.** This package modifies only the `aiearlycareerguide-career-buddy` repository. It does not modify the Student, Recruiter or legacy Professional applications, nor does it migrate any legacy Professional data. **Do not redirect the public `/professionals` route yet.**

## V5.8.1 hotfix — “Unexpected error” after 1 of 3 stages

**Confirmed source-code defect:** V5.8 stored generated question batches as `batches: [[question,...]]` in `assessmentDraft`. Google Cloud Firestore forbids directly nested arrays in document fields. Stage 1 persisted its competency map, but stage 2 failed while saving the first question batch; the frontend consequently displayed the generic `An unexpected error occurred. No chat credit was deducted.`

**Change:** The stored representation is now `batches: [{ questions: [...] }]` (array of maps, each containing an array). The final bank builder reads this representation and supports the old in-memory shape when present. No scoring, purchased entitlements, payment state, user identity, free answers, pricing or report rules were changed.

**Existing affected test user:** Deploy the new ZIP, hard-refresh, sign in with the **same verified email**, open the paid assessment, and press **Retry / resume preparation**. A saved `1 of 3` stage should remain saved. **Do not reset the session or make another ₹499 test payment.** The app should finish stages 2 and 3, then show 12–15 questions.

**Verification:** `npm test` passes 86 tests, including a new save/reload simulation that rejects Firestore-forbidden nested arrays and completes all three stages. Desktop/mobile browser recovery tests pass locally. This cannot replace a real deployed Firestore/OpenAI integration test.

If another error appears after redeployment, open the failed `/api/service?action=assessmentStart` invocation in Vercel logs and share the **error type and message only** (remove any emails, resume details, API keys, payment references or tokens). Do not repeat the checkout.

## V5.8 critical fix — premium competency questions not loading

Some V5.7 sessions were blocked on competency-map errors (`Invalid role competency 3`) and lengthy question-bank generation requests. **This update fixes the flow without changing the billing or scoring rules.**

1. **More precise validation:** Strict field-level diagnostics identify a missing name, type, benchmark or subskills field. Safe normalization accepts harmless alternate field labels and subskill string/object formats. The app still requires four or five valid target-role competencies, including at least two technical and two behavioural skills, and three scored questions per competency. No unsupported data is fabricated.
2. **Staged, resumable preparation:** The skill map and each of the two question batches are prepared in **three separate requests**. Each successful stage is stored under the verified user's session. If step two or three fails, the next attempt resumes from the last valid stage; it does not regenerate or re-bill prior stages.
3. **Bounded backend processing:** Each stage allows two model attempts with a 22-second individual timeout. This reduces the risk of a single long-running serverless request timing out without returning a response.
4. **Visible error and retry:** During preparation the UI shows `stage 1 of 3`, etc. Failures show a message inside the assessment card and a **Retry / resume preparation** button.
5. **Cost and privacy safeguards:** Model responses rejected by validation are recorded in the private usage log and charged against cost reporting; only validated complete banks are cached for other users. Role-specific banks contain no user email or resume. No coaching credits are deducted by preparation.

### Step-by-step private test

1. Download and extract the complete V5.8 ZIP. Replace files in the **separate** `aiearlycareerguide-career-buddy` GitHub repository, then deploy to the **protected Vercel Preview** project (not the public `/professionals` route).
2. Keep the existing private Firebase, OpenAI, Resend and Razorpay **test-mode** environment settings. No new secrets are necessary. **Do not reset the test account or repeat the ₹499 checkout** if the same verified email already has premium access.
3. Log in with the same verified email, open the Premium Career Assessment, and select **Prepare my competency assessment**. Confirm each stage moves forward, then 12–15 scenario questions appear.
4. If an error occurs, select **Retry / resume preparation**. The earlier completed stages should remain. If a previous V5.7 request still holds an active lock, the API may initially return "another request is processing"; do not repurchase the pack.
5. Answer all questions, generate the scored detailed report, and inspect technical/soft-skill gaps. Separately verify Razorpay Test Mode success, failure, coupon and refill flows using the existing private testing guide below.
6. Review Vercel function logs for `Career Buddy competency generation rejected`; new logs specify the failed stage and field, but do not print sensitive resume contents. Never share secret keys or raw personal data in logs.

**Testing:** `npm test` passes 85 tests. `python tests/v5-8-browser.py` passes desktop/mobile mocked interrupted-stage recovery. The V5.6 and V5.7 browser checks continue to pass. These are local checks only; the deployed OpenAI/Firebase and Razorpay endpoints remain to be verified by you. All prices are indicative, public deployment and real payments remain disabled.

## Previous V5.7 fixes

The V5.6 bank generator stopped at errors such as `Invalid role competency 3`. V5.7:
- Normalises harmless AI schema variations (nonsequential competency identifiers and behavioural/behavioral/soft-skill synonyms), without inventing skills or loosening substantive validation.
- Performs up to **three attempts per stage** (role skill-map and each of the two question batches), with targeted correction feedback. Only valid complete banks are saved for reuse. A failed stage does not erase the assessment or consume coaching credits.
- Preserves **4–5 competencies, at least two technical and two behavioural**, three distinct questions per competency (12–15). Report unlocking still requires every question answered. Answer keys stay server-only.
- Separately records successful but *rejected* AI calls in `buddyPreviewUsage`; these can cost real API money even though the bank could not be used. When the provider fails without reporting usage, reconcile against the OpenAI dashboard.
- Ignores expired cached question banks and shows a plain-English retry error rather than `Invalid role competency 3`.

## Payment testing implementation

The package adds a **genuine Razorpay Test Mode checkout**, not real-money checkout:
- Server creates an INR order from the *server-owned* pack price and approved coupon. Browser never supplies the payable amount or credit entitlement.
- Razorpay Checkout popup, including success/failure simulation.
- Server validates the checkout HMAC signature against the **stored** order ID, then independently fetches the payment and confirms `captured`, INR currency, exact amount and matching order ID.
- A Firestore transaction grants a pack **only once**, on a captured payment. Repeating verification or status recovery cannot double-credit the session.
- A **Check test payment status** action can reconcile a captured transaction when the browser closed before the success callback.
- 100% discount coupons are not processed by the gateway. Use a smaller discount (e.g. `EARLY30`) for testing.
- If `PAYMENT_FLOW_MODE=razorpay_test`, the old simulation endpoint is disabled. A misconfigured test key does not silently turn this mode into mock credit purchases.

Razorpay Test Mode uses **mock bank payments without deducting real funds**. `rzp_live_` keys are rejected by the backend. This code is **not enabled for production payments**.

## Step-by-step: private deployment

### Step 1 — update only the separate Career Buddy repository

1. Extract this ZIP and upload/commit its contents to `aiearlycareerguide-career-buddy`, preferably to a new `v5-7-private-test` branch.
2. Deploy the branch using **Vercel Preview** for the Career Buddy project. Enable Vercel deployment protection / authentication. Do not assign the public custom domain.
3. Keep the existing separate Career Buddy Firebase project, OpenAI API configuration, verified Resend sender and access code. Do **not** copy secrets from an uploaded ZIP or from live Student/Recruiter apps.

### Step 2 — configure true-to-life services

In the **Career Buddy Vercel Preview environment**, set or confirm:

```text
PREVIEW_ACCESS_CODE=(private tester code)
PREVIEW_SESSION_SECRET=(random 32+ character secret)
FIREBASE_SERVICE_ACCOUNT_JSON=(separate Career Buddy service-account JSON)
RESEND_API_KEY=(private Resend key)
RESEND_FROM_EMAIL=(verified sender)
OPENAI_API_KEY=(OpenAI API key)
OPENAI_MODEL=(model you've selected for quality and cost testing)
OWNER_RESET_CODE=(separate private testing reset code)
FREE_REPORT_DAILY_LIMIT=5
OPENAI_INPUT_USD_PER_MILLION=(current model input rate)
OPENAI_OUTPUT_USD_PER_MILLION=(current model output rate)
OPENAI_USD_INR=(appropriate assumed INR/USD rate)
PREVIEW_COUPONS_JSON={"EARLY30":30}
```

For a **real Razorpay Test Mode checkout**, additionally configure:

```text
PAYMENT_FLOW_MODE=razorpay_test
RAZORPAY_TEST_KEY_ID=rzp_test_... (from Razorpay Test Dashboard)
RAZORPAY_TEST_KEY_SECRET=(matching secret from Razorpay Test Dashboard)
```

**Never enter keys into this chat, GitHub source files or screenshots.** Use Vercel Settings → Environment Variables → Preview and redeploy to apply changes. Only Test Mode keys are accepted. If you prefer to validate the competency flow before entering payment keys, omit `PAYMENT_FLOW_MODE` to retain owner-simulation mode temporarily.

### Step 3 — test assessment-generation reliability

1. Sign in with one approved, verified test email and the private preview access code.
2. Complete seven Free Career Discovery questions and download the free snapshot.
3. Choose Premium Career Assessment → paste/skip resume → **Prepare my competency assessment**.
4. Test multiple target roles, including the role that previously caused `Invalid role competency 3`.
5. Confirm 12–15 substantive scenario questions appear, with 3 per competency, including technical and behavioural skills. If a bank needs retries, there should be no technical error visible to the user.
6. Verify that the report stays locked until all questions are answered; review the detailed PDF, interview questions and optional resume files.

### Step 4 — test payment workflow (no real charges)

From the **Razorpay Dashboard in Test Mode**, generate a Test Key ID and Secret. Configure them in Vercel **Preview** as above, then redeploy. On your private Career Buddy URL:

1. Finish the free snapshot, select Premium Assessment and click **Pay using Razorpay TEST Mode**.
2. Use Razorpay's published test Visa card `4100 2800 0000 1007`, a future expiry, and any CVV. Complete the test-bank success flow. There is no real debit.
3. Verify the UI moves to the optional resume step and the account receives **60 interactions exactly once**. Check the Razorpay Test Dashboard payment status is **captured**.
4. Test an **unsuccessful** or cancelled payment. Credits must stay unchanged; no paid assessment should unlock.
5. Test a **30% coupon** and confirm the amount was calculated server-side (₹499 → ₹349 at the current indicative price, using nearest-rupee rounding).
6. Use a new test account or an owner reset between *distinct* pack scenarios. Test the ₹149 intro pack (15 interactions) and refill packs (₹249 / 35, ₹399 / 75), including preserved history and remaining credits.
7. After a completed test transaction, try **Check test payment status** and repeat the callback/status check. The same order must not add credits twice.
8. Test closing the page after the test bank says success, then signing in again and selecting **Check test payment status**. A captured order should be recovered; an uncaptured order must not grant credits.
9. Review `buddyTestPayments`, `buddyEmailSessions`, `buddyPreviewUsage` and the Razorpay Test Dashboard. Measure assessment-generation retries, token use and report costs before confirming pricing.

Reference: [Razorpay Test Mode](https://razorpay.com/docs/payments/dashboard/test-live-modes/) and [Test cards](https://github.com/razorpay/markdown-docs/blob/master/payments/payments/test-card-details.md).

### Step 5 — retire legacy Professional entry **after acceptance**

After private end-to-end assessment and test payment verification, change only the **main landing page's Professional link and `/professionals` route** to send *new visitors* to Career Buddy. No old Professional database migration is required per your instruction. Make a routing backup and test the Student and Recruiter links before retiring the old route. Do not activate real Razorpay keys in this build.

## Local automated checks

```bash
npm test
python tests/v5-6-browser.py
python tests/v5-7-browser.py
```

The browser checks use mocked assessment responses and a fake Razorpay Checkout callback. They validate UI state, but **do not confirm actual OpenAI, Firebase, Resend, Vercel or Razorpay network integration**. Those require your configured private deployment and a real Razorpay **Test Mode** transaction.

## Cautions for future public release

This is still a protected test application. Before public launch: production-strength access throttling and abuse controls, operational alerting, full billing reconciliation, real payment/webhook lifecycle, refunds and disputes, a privacy/retention policy and security review are required. Remove owner-reset/preview simulation features from the public build. Preserve explicit user consent and the option to delete personal career/resume data.
