# Career Buddy V5.9 — Restricted Live Pilot + 100% Coupon

**Pilot status:** The application is ready to *configure* for real OpenAI/Firebase/Resend and Razorpay **live credentials**, with a privately limited **100% coupon**. This ZIP has **not** been deployed to the owner's Vercel account or connected to their live Razorpay/Firebase services. Public customer access remains out of scope. **Do not modify the Student, Recruiter or old Professional deployment.**

## What V5.9 adds

- Razorpay **live-mode** gateway integration with server-owned prices and actual captured-payment verification. Test-mode code is retained but cannot run in live mode.
- Safe zero-price entitlement: approved testers may redeem an **owner-controlled 100% coupon** without opening checkout; the server checks the verified email and transactionally grants the pack once.
- Separate database collection `buddyLiveEmailSessions` for private live accounts. Old mock/test paid balances in `buddyEmailSessions` **do not transfer** or grant live access. New free discovery is required for these live pilot accounts.
- Global and per-email coupon-redemption caps, one use per email/pack, persistent Firestore audit records and no reset endpoint in private live mode.
- Default `LIVE_PAID_CHECKOUT_ENABLED=0`. **Real-money transactions are blocked** until explicitly enabled by the owner after live-readiness testing.
- Captured-payment-only, idempotent fulfilment plus status recovery. A signed Razorpay webhook endpoint `api/razorpay-webhook.js` is available when a reachable callback URL is configured; it is unnecessary for zero-value coupons.
- Preview owner-access passcode **and** verified email **and** explicit approved-tester allowlist required for live pilot entry.

## Critical distinction

A 100% coupon **does not test Razorpay checkout, payment capture, settlement, refunds or bank authentication**. It tests server-side promo validation, the paid entitlement and the assessment after upgrade. Actual live charge testing requires enabling `LIVE_PAID_CHECKOUT_ENABLED=1`, an externally reachable verified webhook URL, and using a non-100% coupon or full-price transaction. Do this only after approval and initial pilot checks. Razorpay does not accept an INR 0 order; no order is sent for a free coupon.

## Step-by-step deployment

### 1. Keep the existing applications safe

1. Back up the current `aiearlycareerguide-career-buddy` GitHub main branch and record its current deployment URL. Do not change website routing.
2. Download/extract the V5.9 ZIP; commit it to a new `v5-9-private-live` branch in the **separate Career Buddy repository**.
3. In **Vercel → Career Buddy project → Deployments**, deploy that branch as a new **Preview** deployment. Do not connect the public `aiearlycareerguide.com/professionals` route.
4. In the project's Deployment Protection settings, keep Vercel Authentication on for the preview. This restricts access by Vercel login; the app also requires an access passcode and approved email.

### 2. Configure the Career Buddy private-live environment

In **Vercel → Career Buddy → Settings → Environment Variables → Preview** (preferably scoped to `v5-9-private-live` only), keep or set these previously used application keys:

```text
PREVIEW_ACCESS_CODE=(strong pilot access passcode)
PREVIEW_SESSION_SECRET=(random secret of at least 32 characters; preserve only if needed)
FIREBASE_SERVICE_ACCOUNT_JSON=(existing separate Career Buddy Firebase service account JSON)
OPENAI_API_KEY=(your API key)
OPENAI_MODEL=(tested working model)
RESEND_API_KEY=(your Resend key)
RESEND_FROM_EMAIL=(verified sending identity)
FREE_REPORT_DAILY_LIMIT=5
OPENAI_INPUT_USD_PER_MILLION=(current model input rate)
OPENAI_OUTPUT_USD_PER_MILLION=(current model output rate)
OPENAI_USD_INR=(cost-estimate FX rate)
```

Also configure the NEW pilot/payment variables:

```text
PAYMENT_FLOW_MODE=razorpay_live
LIVE_PRIVATE_MODE=1
LIVE_TESTER_EMAILS=(comma-separated verified test addresses)
LIVE_FREE_COUPON_EMAILS=(comma-separated subset allowed to redeem the 100% coupon)
LIVE_FREE_COUPON_CODE=(private code you create; 3–24 capital letters/numbers/-/_)
LIVE_FREE_COUPON_MAX_PER_EMAIL=2
LIVE_FREE_COUPON_GLOBAL_LIMIT=20
LIVE_COUPONS_JSON={"EARLY30":30}
RAZORPAY_LIVE_KEY_ID=(rzp_live_... key from Razorpay LIVE dashboard)
RAZORPAY_LIVE_KEY_SECRET=(matching LIVE secret)
LIVE_PAID_CHECKOUT_ENABLED=0
```

The two email lists are mandatory. The 100% code is not hard-coded and is **not** shipped in this ZIP. Set the code and all secrets **only in Vercel**, never in GitHub, chat messages, screenshots or query strings. Redeploy after updating variables.

`RAZORPAY_LIVE_KEY_ID` must begin `rzp_live_` and a test key is rejected. `PAYMENT_FLOW_MODE=razorpay_live` never silently falls back to mock credits. The backend blocks real-money checkout while `LIVE_PAID_CHECKOUT_ENABLED=0`.

### 3. Verify restricted access

1. Open the new protected Preview URL and sign into Vercel (or use an explicitly granted viewer link).
2. Enter the separate pilot access passcode and a verified email on `LIVE_TESTER_EMAILS`; finish the email OTP.
3. Confirm that a **non-approved email is denied** and cannot receive a verification code.
4. Expect an initially **new** live test account, even if the same email previously completed the older preview, because the live collection is isolated. This avoids reusing uncharged mock credits.
5. Complete the seven-question free assessment, download the snapshot and confirm it is saved.

### 4. Test ₹499 premium activation through the 100% coupon

1. Choose Premium Assessment from the free snapshot.
2. Enter the code defined under `LIVE_FREE_COUPON_CODE` in the Starter coupon field.
3. Select **Apply coupon / Continue**. No Razorpay window should appear, **₹0 is payable**, and 60 interactions should be added **exactly once**.
4. Verify the first paid step is optional resume paste/skip, then 12–15 scored competency questions load in three preparation stages.
5. Complete the questions, generate the full report and optional revised resume; check interview preparation and remaining credits.
6. Sign out and back in with the same verified email. Confirm the report and credits persist.
7. Try redeeming the same coupon for the same Starter pack again. The server must reject repeat eligibility; it must not create a second grant. Coupon activity is recorded in Firestore.
8. To test a Standard or Extended refill, allow the tester a second complimentary redemption (default max 2 per email); it will be recorded separately by pack. No real Razorpay order is created.

### 5. Verify the Firestore audit and running costs

Under the same separate Career Buddy Firebase project, check:

- `buddyLiveEmailSessions` — verified private-live profile, saved snapshot, selected pack, credits and output files (not mock test data)
- `buddyLiveCouponUsers` — per-email/pack redemption history
- `buddyLiveCouponCounters` — global coupon use limit
- `buddyLiveComplimentaryGrants` — one audit record per actual zero-price grant
- `buddyPreviewUsage` and OpenAI dashboard — input/output tokens, rejected AI-generation retries and report-generation usage

Never manually edit a paid credit balance or redeem the same coupon after an owner reset. **Owner reset is disabled in this pilot.**

### 6. Live money test and public release — deliberately separate

For later real-money checkout, first ensure the Razorpay merchant account is live-approved and webhooks can reach `https://<reachable-career-buddy-host>/api/razorpay-webhook`. Keep the webhook secret (`RAZORPAY_LIVE_WEBHOOK_SECRET`, minimum 16 characters) in Vercel and configure the identical secret in Razorpay Dashboard. Subscribe to `payment.captured` (and optionally `order.paid`). **Vercel Authentication blocks external webhooks** if the domain is protected. Use a verified, narrowly scoped bypass strategy or a dedicated reachable webhook host; do **not** simply turn off deployment protection for the whole pilot.

Then and only then set `LIVE_PAID_CHECKOUT_ENABLED=1`, redeploy, and test an explicitly authorised real purchase: captured status; exactly-once credits; failed/cancelled payments; recovery; coupon discount; refunds/disputes and reconciliation. **Money may actually be charged.** Do not enable for an unreconciled or publicly accessible environment.

Only after the complete assessment and real-payment checks pass should you update the main website's `/professionals` route. The Student and Recruiter applications remain unchanged and there is no legacy Professional data to migrate per the owner's instruction.

## Tests run locally

```bash
npm test
python tests/v5-9-live-browser.py
python tests/v5-8-browser.py
python tests/v5-7-browser.py
```

These checks use mocked UI/provider results and unit tests. They **do not** establish a successful real Razorpay payment, webhook delivery or authentication against the owner's live deployment. This is a restricted live-services pilot, not a publicly released payments product. Perform a security/privacy and billing review before public launch.
