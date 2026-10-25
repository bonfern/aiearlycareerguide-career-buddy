# Career Buddy V5.10 — production integration checklist

## Deploy order
1. Back up both repositories. Deploy V5.10 to `aiearlycareerguide-career-buddy` **first**, keeping the current website `/professionals` rewrite pointed at the legacy service.
2. Validate `https://aiearlycareerguide-career-buddy.vercel.app/` with its own verified-email login and report flow. Verify all API/asset requests work and that simulation is disabled.
3. In **Career Buddy Vercel Production**, set production secrets below. Values must be entered through Vercel, never source files or chat.
4. Confirm Razorpay live webhook destination works. The webhook MUST be publicly reachable; no Vercel Authentication or access passcode can block the webhook path. A signed webhook has a valid HMAC and captured-provider verification, unsigned requests must fail.
5. Before switching the main website route, complete a deliberately authorised low-value *real paid* transaction (not a 100% coupon) and verify captured status + exactly one entitlement. Also verify failure and recovery. This is actual money.
6. Only after acceptance, upload the companion **main-website routing patch** to BONCCPMT-V2 and deploy. It rewrites `/professionals/` and `/professionals/:path*` to the Buddy app. Other website routes remain unchanged.
7. Smoke-test `/professionals/`, `/professionals/style.css`, `/professionals/app.js`, `/professionals/api/service?action=config`, and the new signed webhook `/professionals/api/razorpay-webhook` using Razorpay webhook test/live authorised delivery. Confirm Student and Recruiter routes still operate. Monitor errors and costs.
8. Keep the legacy Professional Vercel project available for rollback. To roll back, restore only the three original `/professionals` rewrites, and remove the new redirect; never edit the Student or Recruiter paths.

## Career Buddy Vercel Production environment
Required:
```text
PAYMENT_FLOW_MODE=razorpay_live
LIVE_PUBLIC_MODE=1
LIVE_PRIVATE_MODE=0
PREVIEW_SESSION_SECRET=<existing session secret, at least 32 characters>
FIREBASE_SERVICE_ACCOUNT_JSON=<Career Buddy Firebase service account JSON>
OPENAI_API_KEY=<secret>
OPENAI_MODEL=<model chosen and cost-validated>
RESEND_API_KEY=<secret>
RESEND_FROM_EMAIL=<verified sender address>
RAZORPAY_LIVE_KEY_ID=<rzp_live_...>
RAZORPAY_LIVE_KEY_SECRET=<secret>
RAZORPAY_LIVE_WEBHOOK_SECRET=<independently generated secret, at least 16 characters>
PUBLIC_SITE_ORIGIN=https://www.aiearlycareerguide.com,https://aiearlycareerguide-career-buddy.vercel.app
LIVE_PAID_CHECKOUT_ENABLED=0
FREE_REPORT_DAILY_LIMIT=5
LIVE_COUPONS_JSON={"EARLY30":30}
```
To allow **real paid** checkout after webhook and real-charge verification, change `LIVE_PAID_CHECKOUT_ENABLED=1` and redeploy. This charges real funds.
Optional restricted owner 100% coupon:
```text
LIVE_FREE_COUPON_CODE=<private random coupon>
LIVE_FREE_COUPON_EMAILS=<exact verified addresses, comma-separated>
LIVE_FREE_COUPON_MAX_PER_EMAIL=2
LIVE_FREE_COUPON_GLOBAL_LIMIT=20
```
Owner code can only be redeemed by explicitly named email addresses; no Razorpay order is generated for a full discount. A complimentary redemption is NOT a test of actual live payment processing. Coupon abuse caps are enforced server-side.

**Remove `PREVIEW_ACCESS_CODE` from the production environment** (no longer needed in public mode); preserve `PREVIEW_SESSION_SECRET` to avoid invalidating verified sessions. **Do not enable mock payment routes.** Do not alter Firebase project or key without coordinating existing accounts.

## High-priority launch gate
Before public marketing: review consent, terms/refunds/privacy against the actual Career Buddy product; ensure support contact; add WAF bot/IP rate limits in Vercel and Resend sending caps; test payment failure/recovery, refund and disputes; verify reports/resumes for factual accuracy and cost monitoring. No public release should be considered verified solely from passing local tests.
