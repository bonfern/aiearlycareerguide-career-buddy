# V5.29 — Owner email sign-in and business analytics

Baseline: V5.28.1, including the working Premium Assessment Next fix, report generation progress, branded documents, feedback collection, moderation and root-relative dashboard assets.

## Fixed: Feedback Dashboard sign-in

`/admin/feedback` no longer leaves owners with only "Verify your email to start or resume." When the existing HttpOnly session is missing or belongs to a non-admin account, the page displays a complete email + OTP verification form. The same verified email flow, privacy/adult consent and optional private-preview code are reused. The email must match `FEEDBACK_ADMIN_EMAILS`. No permanent admin password is stored in browser code. The backend checks permissions again for every data read and moderation action.

## New: Business Analytics

Dashboard: `/admin/analytics` (linked from Career Buddy owner navigation and Feedback Dashboard).

- Day / Week (Monday start) / Month / Year breakdown, editable start/end dates, CSV export and IST timezone.
- Unique completed Free Snapshots; unique Premium and standalone Career Buddy *paying* customers; Premium reports completed; active coaching users; coaching refills.
- Complimentary Premium and Buddy activations shown separately from paid buy-ins.
- Free cohort to paid Premium / paid Buddy / any paid conversion, with 7-day, 30-day or lifetime window. Recent cohorts are marked provisional.
- Gross verified receipts **before refunds**; cancelled/unverified checkouts and Razorpay Test transactions excluded.
- Server-side aggregate response only. Individual account/profile/payment details are not sent to the analytics dashboard.

### Sources / reporting limitations

Production-only Firestore collections `buddyLiveEmailSessions`, `buddyLivePayments`, `buddyLiveComplimentaryGrants`. Historical Free Snapshot and report completion events can be counted if timestamp fields exist. Coaching activity for older sessions may be incomplete where message history was trimmed before the new `lastCoachReplyAt` field was added. Payments are based on successfully granted and captured live orders; 100%-coupon grants are not counted as paying customers. No speculative historical backfilling. Totals are limited to 20,000 source records **per collection** for this initial implementation; beyond that the API fails with an explicit scaling message instead of silently returning incomplete figures. This dashboard does not currently reconcile refunds; gross receipts must not be represented as net revenue.

## Production configuration and test steps

1. Commit the **entire ZIP contents** to the root of the existing GitHub Career Buddy repository. Retain existing environment variables and secrets. Redeploy **Production**.
2. In Vercel, set `FEEDBACK_ADMIN_EMAILS` for **Production** to your existing verified Career Buddy email. For more than one administrator, use comma-separated email addresses. Save and redeploy for changes to take effect.
3. Visit `/admin/feedback` in a private/incognito browser. Enter the allowlisted email, confirm privacy/age consent, request the code and enter the six digits. Verify feedback cards load or show "No feedback". Test hide/restore using a test feedback record.
4. Visit `/admin/analytics` in the same browser. Confirm counts load, switch day/week/month/year, choose custom dates and try CSV export. Confirm coupons and test transactions do not increase paying-customer counts.
5. Test with a **different non-admin email**: neither feedback nor analytics should reveal any user-level or aggregate data.

## Local verification

- New analytics unit tests pass (conversion math, coupon exclusions, IST buckets, input validation).
- Chromium browser mocks pass at 1280, 390 and 320 px for both dashboard OTP flows, data loading and controls.
- Full Node suite: 163 passed, 25 failed, 11 skipped; the 25 inherited failures are the same superseded intake-flow expectations as in V5.28.1 and are not claimed fixed.

The production Vercel, Firebase, Resend and Razorpay connections have **not** been tested or modified by the build process. No Firestore migrations, payment-rule changes or data deletions are part of this version.
