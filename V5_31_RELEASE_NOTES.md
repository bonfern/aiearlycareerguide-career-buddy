# V5.31 – Guest Free Snapshot / Instagram conversion release

## What's changed

- Users in public-live mode may start the Free Career Snapshot with **no email, OTP or registered account**. The start button includes a concise, prominent privacy/age notice and links to the full policies.
- Free questions, server-generated Free Snapshot, on-screen results and PDF download work with an HttpOnly signed **guest session** (`buddy_guest`) lasting at most seven days.
- Email verification remains required to save a report to an account, continue with the Premium Assessment or purchase Career Buddy coaching. **Verification happens before payment**. A verified account inherits the guest answers and report unless that email already owns an existing report or paid assessment. Existing paid entitlements are never overwritten.
- Guests are explicitly blocked from all paid checkout, coupon, resume, chat, feedback and admin endpoints. The original `buddy_identity` verified session and Razorpay integrations remain unchanged.
- Mobile hero places the **FREE Career Snapshot** and yellow CTA before the large hero image; supplied brand-logo.webp remains the official logo.
- New pseudonymous funnel counters: landing_view, free_cta_clicked, guest_started, first_answer, snapshot_generated, email_verified. They are included on the existing admin Analytics dashboard for the selected date range (starting from deployment only).
- Existing global daily free-report cap remains; configurable guest-start and guest-report per-network limits added. No raw IP addresses, emails or questionnaire responses are stored in the funnel counter records.
- FAQ, Know More, Privacy and Terms updated for the guest model.

## Deploy

1. Back up production Firestore (and consider a preview/staging deployment first). Preserve all existing Vercel secrets and Razorpay/Resend/Firebase settings. Deploy this entire project, **not** only app.js.
2. Verify `LIVE_PUBLIC_MODE=1` with `PAYMENT_FLOW_MODE=razorpay_live`. Guest mode is ON in public live unless `DISABLE_GUEST_SNAPSHOT=1` (emergency kill switch). Private preview remains OTP-gated.
3. Set/verify: `FREE_REPORT_DAILY_LIMIT` (currently 5 in earlier PRODUCTION-SETUP.md; **5 will limit the whole ad campaign to five snapshot requests/day**), `GUEST_STARTS_PER_IP_DAY` (default 15), `GUEST_REPORTS_PER_IP_DAY` (default 5). Choose caps according to acceptable API budget and real-world shared networks.
4. Set Firebase Firestore TTL policy for **`buddyGuestSessionsV1.expiresAt`** (numeric epoch milliseconds requires an appropriate timestamp field to use Firestore managed TTL; without it, use a scheduled cleanup job for numeric expiresAt). Consider retention/cleanup for **`buddyFunnelUniqueEventsV1`** (expiresAt numeric epoch milliseconds) and network-limit collections. Application rejects expired guest sessions regardless of cleanup. Do not remove any verified email session or purchase collections.
5. Visit `/professionals/` in a clean mobile browser and verify: first CTA goes directly to question 1; complete the whole form; generate the report; download the PDF; choose Premium and verify email; verify the same completed report is present; activate a test coupon/checkout using established payment test procedures; check the analytics owner dashboard.
6. Verify the same flow in the Instagram in-app browser. Check that consent, link, checkbox, and view/download controls work at 320px and 390px. Confirm login, payment and webhook recovery for pre-existing paid accounts.
7. Check Vercel/WAF/IP protections, OpenAI usage and free caps after the first ad run. Open the owner analytics view to locate the largest funnel loss.

## Rollback

Set `DISABLE_GUEST_SNAPSHOT=1` and redeploy or roll back the deployment. In-progress guest sessions will stop working while disabled; existing verified sessions and purchases are unaffected. Do not rotate `PREVIEW_SESSION_SECRET` during normal release.

## Testing caveats

The source ZIP does not contain live service credentials. Node unit tests can verify local logic, and browser layouts can be checked offline, but production Firestore transactions, live email delivery and Razorpay capture **must be tested in a deployment**. The original V5.30 test suite already had 25 obsolete failing assertions for previous question counts and text, before this change; do not treat those older test failures as production defects. This release adds V5.31-specific tests.
