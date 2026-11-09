# AI Early Career Guide – Career Buddy V5.32

**Release focus:** More credible, role-level Free Career Snapshots and a simplified Premium/Career Buddy purchase journey. This source code is **not deployed** by this package.

## Changes

1. **Current designation captured:** New free assessments ask for the current/most recent role (with suitable wording for students) separately from the target role. The questionnaire has 8 mandatory questions, with a conditional ninth for visitors still exploring.
2. **Target-role specificity:** A visitor who names a specific target role receives **one recommendation centred on that exact role**. Three alternatives are reserved for visitors explicitly exploring career options. A VP/Director-level target gets leadership-level capabilities and examples rather than entry-level Manager/Analyst routes. The role level is not silently downgraded. Previously generated reports remain historical records.
3. **Free Snapshot report quality:** The content generator rejects substituted/downgraded recommendation paths, uses more careful evidence language, and produces better-formatted PDFs with section spacing instead of a forced premature page break. A fallback report is still available if AI generation fails; it avoids claiming demonstrated competence from self-report alone.
4. **Integrated paid checkout:** Both Premium Assessment (`starter`) and direct Career Buddy coaching (`intro`) present package details, coupon, purchase email, privacy/age confirmation and the Proceed action on **one page**. An email address is syntactically checked for obvious mistakes but is explicitly **not** claimed to be mailbox-verified. No six-digit code is needed before a normal paid Razorpay purchase.
5. **Secure purchase continuity:** A guest who enters a purchase email gets a new, randomly identified checkout session; it is **not** an existing account keyed by that email. Their free answers/report move into that session. A securely signed, HttpOnly browser cookie permits same-browser access after payment. Once a real Razorpay charge is confirmed, an expiring, single-use **email return link** can restore paid access on another browser. The link can also be requested later from the sign-in screen. No typed OTP is required for return-link sign-in.
6. **Corrections and recovery:** Up to two corrections are allowed for an unverified checkout email. Customers can resend a link; return-link requests receive a generic response to prevent email-account enumeration. Coupon redemption limits are tracked per email rather than per random checkout identity. The existing paid grants and verified Razorpay payment signatures remain in place.
7. **Layout and metrics:** Mobile checkout has been checked at 320px and 390px. The mobile navigation no longer sticks over the checkout form. Funnel events distinguish viewing offers, checkout email entry and confirmed purchase.

## Special cases and limitations

- **100%-off complimentary coupons** are exempt from the no-OTP paid-purchase pathway because they can grant value without a successful payment proving customer intent. Such offers still require a verified mailbox. Normal chargeable purchases (including partially discounted ones) skip OTP.
- Email deliverability is not guaranteed by syntactic/domain checks. The checkout email must be entered correctly; the customer can correct it while their browser session exists. Payment does not establish ownership of the entered mailbox.
- A first-time buyer whose typed email matches a pre-existing user's email gets a distinct new purchase session; the system deliberately **does not merge** paid accounts without mailbox proof. A future secure merge procedure can be considered separately.
- The secure return link expires after 7 days and is single-use. An existing paid customer can request a new link later by entering the same email on the login page. The URL in the email is fixed to `https://www.aiearlycareerguide.com/professionals/`.
- The Free Snapshot question/schema version and report cache version have increased. Saved historical reports have not been rewritten or silently replaced.
- Older test files contain prior text, identity and version assumptions, and will need maintenance; **do not consider the entire old test suite green**. The dedicated V5.31/V5.32 checks passed, as detailed below.

## Deploy checklist

1. Deploy the ZIP to a **Vercel preview** first, keeping existing Firebase data, deployed URL routes and environment variable **secret values** intact. Do not recreate/re-key existing email-verified accounts. Back up production Firestore.
2. Check `LIVE_PUBLIC_MODE=1`, `PAYMENT_FLOW_MODE=razorpay_live`, `LIVE_PAID_CHECKOUT_ENABLED=1`, the existing `RAZORPAY_LIVE_*` configuration, payment webhook endpoint/signature, and `PREVIEW_SESSION_SECRET` with at least 32 characters. Do **not** change that secret on an existing live site without a session-migration plan.
3. Confirm `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are active and the sender is verified. The recovery link requires the Resend transactional email provider; the paid entitlement remains available in the original browser if email delivery fails.
4. Evaluate `FREE_REPORT_DAILY_LIMIT` against the intended advertising traffic. Previous production notes specify a cap of **5/day**; raising it should be paired with usage budgets and rate limits. Guest checkout sessions default to `GUEST_CHECKOUTS_PER_IP_DAY=8` (new optional environment override; rate-limited by server).
5. Check Firestore access and cleanup/retention policies for new collections `buddyPaidReturnLinksV1`, `buddyPaidReturnLinkRequestsV1`, `buddyPaidReturnNetworkLimitsV1`, `buddyPaidReturnEmailLimitsV1`, and `buddyCheckoutLimitsV1`. Link expiry is enforced server-side; old records may be cleaned under a separate retention policy.
6. Test: anonymous VP Process Excellence guest assessment → Free PDF; exploratory guest assessment → 3 career paths; Premium checkout with valid email + optional partial coupon → captured Razorpay payment → assessment available immediately without OTP; same for direct Career Buddy; repeat login using emailed return link on another browser; retry old link; typo correction and resend; same-email existing customer isolation; payment cancelled/failed; webhooks that arrive before or after frontend verification; free daily cap; mobile Instagram in-app browser.
7. **Do not treat local tests as real-payment validation.** Test email delivery and Razorpay's server-verified checkout/webhook path in the deployment environment before enabling another ad campaign.

## Local validation

- JavaScript syntax checks for backend files and `app.js`: passed.
- `npm run test:v532`: 15 targeted unit checks passed (6 V5.31 and 9 V5.32).
- Mocked Playwright browser journeys: 1280px, 390px and 320px Premium checkout and 390px Career Buddy checkout passed; no typed OTP or horizontal overflow.
- VP snapshot sample PDF: generated and inspected (two pages, no headline/header overlap).
- Older broad regression suite is **not all passing** because it still expects earlier flow behavior. It requires updates before a formal full-suite release gate.

## Notes

No changes were made to the production website or live Firebase and Razorpay accounts by generating this package. Code deployment and live environment validation remain necessary. The full ZIP includes all files; the patch ZIP contains only files added or changed relative to V5.31.
