# Career Buddy V5.14 — Free-snapshot CTA and live coupon setup

## Code change
- Single free-snapshot action inside the existing Discovery card now uses a larger, yellow, mobile-friendly CTA label.
- No backend logic, payment behavior, pricing, or login state changed.
- Tested via `npm test`.

## The existing 100% coupon is not a normal discount
- `LIVE_COUPONS_JSON` accepts 1–99 percent only. Preserve `EARLY30` and any other live discounts in that JSON.
- `LIVE_FREE_COUPON_CODE=CB1004RNZF4TZ3G5OKQJC` must be present as its OWN Vercel Production variable.
- `LIVE_FREE_COUPON_EMAILS=` must include the exact email the customer verified on Career Buddy; commas for multiple email addresses.
- `LIVE_FREE_COUPON_MAX_PER_EMAIL=2` and `LIVE_FREE_COUPON_GLOBAL_LIMIT=4` are optional caps; a completed redemption of the same pack cannot be repeated by the same account.
- If the free snapshot was already purchased as Premium with a normal coupon, the user is not eligible to buy the Starter pack again; test with a different verified account or another eligible pack.
- ₹0 complimentary redemptions do not exercise Razorpay Live checkout.
- Review Vercel Production environment selection, save and redeploy. Do not put secrets in GitHub.

## Live website details in Razorpay
In Razorpay Live Mode, check **Account & Settings → Business website detail**. The public product checkout URL is `https://www.aiearlycareerguide.com/professionals/` (NOT the webhook URL). If the registered business website already covers `www.aiearlycareerguide.com`, check if Razorpay needs the product path updated. If Razorpay treats this as another site/app, use **Add additional website/app details**, if available, and submit the required About/Contact/Pricing/Terms/Privacy/Refund links for review. Keep all policies and pricing accurate.

The webhook is a separate integration that should continue pointing to `https://aiearlycareerguide-career-buddy.vercel.app/api/razorpay-webhook` as long as that endpoint is deployed, reachable and processing callbacks; its secret must match `RAZORPAY_LIVE_WEBHOOK_SECRET`. Do not enable live paid checkout until verified.
