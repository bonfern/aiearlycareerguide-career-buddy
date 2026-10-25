# Career Buddy V5.13 — Visual Focus Fix + Live Razorpay Activation

## What is fixed in this ZIP

- Landing heading “Discover your next career move” and paid heading “Unlock your personalised Career Toolkit” previously showed a black rectangular browser focus outline after screen navigation.
- Cause: `toPageStart()` intentionally focuses each heading to provide screen-reader announcements, which triggers Chromium's native outline on `h1`/`h2` with `tabIndex=-1`.
- Fix: CSS removes outlines **only** from programmatically focused static headings. Keyboard-visible focus indications for buttons, links and inputs remain.
- `index.html` resource query version is bumped to `v=5.13` so visitors receive the updated CSS rather than cached V5.12 styles.
- Existing payment/coupon/checkout code unchanged, so no data migration, no adjustment to pricing or credits.

## Why the payment screen still says paid checkout is not enabled

V5.12/V5.13 deliberately check three conditions before allowing real-money checkout:

1. `PAYMENT_FLOW_MODE=razorpay_live`, with valid `RAZORPAY_LIVE_KEY_ID` and `RAZORPAY_LIVE_KEY_SECRET` in Vercel Production.
2. `RAZORPAY_LIVE_WEBHOOK_SECRET` in Vercel Production (minimum 16 characters) matching the new Live webhook configured in the Razorpay Dashboard.
3. `LIVE_PAID_CHECKOUT_ENABLED=1` in Vercel Production. This was previously kept at `0` to prevent inadvertent customer charges before the webhook is live.

Configure webhook `https://aiearlycareerguide-career-buddy.vercel.app/api/razorpay-webhook` (POST), events `payment.captured` and `order.paid`; ensure deployment protection and firewall do not block Razorpay's callback. Do not delete the webhook for the earlier Professional Assessment during rollout.

**Caution:** Changing `LIVE_PAID_CHECKOUT_ENABLED` to `1` allows actual customer payments. Do not do it until the webhook and consumer policies are ready and you are prepared to accept real charges.

After you save the variables and redeploy the **Career Buddy Production** project, check:

`https://www.aiearlycareerguide.com/professionals/api/service?action=config`

Expected fields: `configured:true`, `paymentMode:"razorpay_live"`, `checkoutReady:true`.

100%-discount private owner coupons can be redeemed with checkout disabled if otherwise eligible. 99%-discount coupons require enabled live paid checkout and will create a **real Razorpay charge**. Validate a successful captured payment, exactly-once grant and webhook delivery for each pack with your own authorised account. Remove high-value test coupons after validation.

## Deployment and tests

Upload ZIP **contents** to `aiearlycareerguide-career-buddy` only. Existing `/professionals` rewrite remains unchanged; do not modify main website repository.

- `npm test`: 110 passing tests in this copy.
- Playwright desktop and 390px/320px saved-state/navigation flows: passed.
- Browser computed outline style after heading focus: `none` on both Home and Payment headings.
- No real Razorpay payments charged; no Vercel/Razorpay settings modified in your accounts.
