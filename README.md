# Career Buddy V5.13 — Heading Outline Fix and Live Checkout Setup

This project powers **https://www.aiearlycareerguide.com/professionals/** through the existing Career Buddy Vercel deployment and main-site rewrite. It is NOT the old Professionals repository or the main site.

V5.13 builds on V5.12 by hiding the browser outline on programmatically focused non-interactive headings (while keeping keyboard focus indicators for actionable controls); it bumps the asset version to refresh the browser cache. No payment security, coupon, pricing or entitlement code is changed.

V5.12 builds on V5.11: fixes signed-in reload returning to the free report; removes sticky status errors, softens the payment card highlight, labels both purchase buttons “Proceed”, and exposes read-only checkout readiness. The payment processing safeguard is unchanged. See **V5_12_FIX_AND_PAYMENT_STEPS.md** for production steps. It does not automatically enable paid checkout or generate a live payment.

## What's changed
- Main-site link, clearer "Career Buddy" presentation, FAQ/Know More/Terms/Privacy/Refund/Contact pages.
- Free discovery: back/review and edit of earlier saved answers before snapshot generation, with no OpenAI calls for navigation. Changed role selections rebuild the relevant profile without stale skill arrays.
- Seven existing free questions refined. No additional model calls.
- Free preview and PDF have one "What we need to check next" section instead of a separately labelled next-steps section. Paid competency evaluation is clearly optional and separate. Older V5.10 snapshots are still readable.
- Gentle image-backed form panels, enhanced mobile layout, horizontal overflow correction, and public owner test tools hidden.

## Tests
`npm test` for Node unit/regression suite. `python tests/v5-11-browser.py` for Playwright mock browser flow: mobile, free revision, ₹499 premium and ₹149 coaching. Browser tests use **simulated Razorpay callback data and API responses** and make NO real payments.

## Deployment
Upload the contents of this ZIP to **aiearlycareerguide-career-buddy** (the same repo you used for V5.10). Redeploy Vercel Production. No changes are needed in BONCCPMT-V2: `/professionals/` already proxies here. Preserve all existing environment variables and session keys. The current main-site routing covers `/professionals/*.html` and `/professionals/info.css`.

See [PAYMENT-TEST-PLAN.md](./PAYMENT-TEST-PLAN.md) for the two live-payment verification gates and privacy/policy approval required before fully marketing the paid services.
