# Career Buddy V5.12 — Navigation and Checkout UI Fix

## Resolved

1. **Opening /professionals/** with an existing verified account now lands on the main Career Buddy landing page instead of auto-opening the saved free snapshot. Data and previous reports remain saved. Selecting Free Career Discovery again resumes the saved journey; My reports opens saved reports explicitly.
2. **The previous stage's payment error/status banner** is cleared on navigation (for example, when clicking Home). A successful purchase still displays its confirmation on the correct new screen.
3. The price card no longer has an overly prominent yellow outline that resembles a selected/highlighted item.
4. Both introductory (₹149) and Premium Assessment (₹499) purchase buttons say **Proceed**, whether or not the user enters a discount code.
5. The UI explicitly shows when *real-money checkout is disabled*, while allowing eligible owner 100% coupons through server-side validation. No coupon codes, pricing or Razorpay credits are altered.
6. The server's `action=config` and verified `action=state` responses now include `checkoutReady`, distinguishing usable Razorpay credentials from checkout being enabled with a configured webhook. No secrets are returned.

## Root cause of the screenshot's payment error

V5.11's backend responds **Online checkout is temporarily unavailable** if `LIVE_PAID_CHECKOUT_ENABLED` is anything other than `1`. This is intentional, even when `paymentMode: razorpay_live` and `paymentsEnabled: true`.

The V5.12 UI **does not** remove this safeguard. To permit an authorized, real-money transaction after Razorpay has a functional production webhook:

1. In **Career Buddy Vercel Project → Settings → Environment Variables → Production**, ensure `PAYMENT_FLOW_MODE=razorpay_live`, `RAZORPAY_LIVE_KEY_ID`, `RAZORPAY_LIVE_KEY_SECRET`, and `RAZORPAY_LIVE_WEBHOOK_SECRET` are correctly set. The webhook secret must be at least 16 characters, and must match Razorpay's webhook setting.
2. **Verify Razorpay Live webhook delivery** to `https://www.aiearlycareerguide.com/professionals/api/razorpay-webhook` (or use the standalone deployment URL if the main-site proxy is not passing webhook requests). Subscribe to `payment.captured` and `order.paid`. Make sure no Vercel deployment protection blocks POST requests to this endpoint.
3. When explicitly ready to charge real money, change `LIVE_PAID_CHECKOUT_ENABLED=1` in Vercel Production, save and **redeploy** the Career Buddy Production deployment.
4. Visit `https://www.aiearlycareerguide.com/professionals/api/service?action=config`. Verify `configured:true`, `paymentMode:"razorpay_live"`, and `checkoutReady:true`.
5. From two separate verified accounts, conduct authorized paid flow checks for **₹499 Premium Assessment** and **₹149 Intro Coaching**. Each must open the Razorpay live form, collect the selected actual amount, and unlock access only when Razorpay confirms payment captured. Check invoices, webhook deliveries, transaction ledger, refund handling and that repeated callbacks don't grant credits twice.

**WARNING:** Step 3 immediately enables actual charges for customers, not test transactions. Do not enable real checkout if the webhook is absent or not verified. Use the existing restricted owner 100% coupon if you want to test activation without a real charge, but it cannot validate live payment capture.

## Deployment

- Upload the ZIP *contents* to **aiearlycareerguide-career-buddy** (not old Professionals and not BONCCPMT-V2).
- Redeploy Career Buddy Vercel Production. No main-website rewrite update is necessary because `/professionals/` is already pointing to Career Buddy.
- Preserve `PREVIEW_SESSION_SECRET`, Firebase/Resend/OpenAI credentials and all existing payments/data. No migration or Firestore reset.
- Refresh the public site after Vercel reports a successful deployment.

## Local tests

- `npm test` — 108 passing unit/regression checks.
- `python tests/v5-11-browser.py` — 1280px, 390px and 320px; simulated Premium/Intro checkout-to-access flows.
- `python tests/v5-12-browser.py` — saved-login landing page, deliberate report navigation, checkout-disabled notice and clearing an old payment error across those three widths.
- No live Razorpay payments were charged during these tests.
