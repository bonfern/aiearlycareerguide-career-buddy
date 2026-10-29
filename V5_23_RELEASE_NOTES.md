# Career Buddy V5.23 — Role skills, Firestore coupons and checkout switching

## Changes

1. The new FREE Career Snapshot adds **four important target-direction skills**, each with one sentence describing how the skill is used. This appears in the on-screen report, saved-report dialog and PDF, between the transferable advantage and recommended career pathways. It uses the already-cached role skills and **does not cause an additional OpenAI API request**. This does not expose any tested skill scores or paid gap analyses. Previous saved reports remain unchanged.
2. Live discount codes can now be created in the **`buddyLiveCoupons`** Firestore collection, without editing Vercel variables or redeploying. Supported discounts are **1–100%**, allowed-packs, allowlisted email addresses, active/expiry dates, and per-email/global redemption limits. The 100% path still requires allowlisted verified accounts and grants entitlements with a transactional ledger. Existing Vercel coupon variables continue as fallback.
3. **Razorpay cancellation and package switching:** a closed checkout triggers a server-side payment-status check; if there is no captured payment, the pending checkout lock is cleared. The user can then choose the other package or a new coupon without waiting 30 minutes. A captured payment is credited, not lost. Original order records remain for late webhooks and status recovery; credit grants stay idempotent. Payment receipt verification remains server-side. A Premium user's tier is not downgraded by a delayed Coaching payment.
4. The photographed Vercel `[DEP0169] url.parse()` log is a Node.js deprecation warning, **not** proof of a Razorpay payment error. New payment error reports should include the complete error message, HTTP status and `action` from the latest request, with credentials hidden.

## Install and validate

Upload this complete ZIP's **contents** to the existing `aiearlycareerguide-career-buddy` GitHub repository and redeploy Career Buddy Production. No change to the main website or old Professional repository is needed. No new environment variables are required.

- Verify the free report with a **new** report: check four skill descriptions, three pathways, three actions and the Premium section last; verify PDF is at most three pages.
- Create `CBTEST99` and a 100% code in Firestore following `FIRESTORE_COUPONS_GUIDE.md`. Check restricted/expired codes are rejected, and a correctly allowlisted 100% code activates access with no Razorpay order.
- Use a verified account with no previous paid entitlement to open the ₹149 Coaching checkout, close it, then open the ₹499 Premium checkout; repeat in reverse. Neither path should retain the old 30-minute lock.
- When webhook and live API keys are verified, perform an authorised small **real-money** 99%-off payment and check it is captured, credited exactly once and logged in Firestore. An automatically generated local test cannot prove Vercel/Firebase/Razorpay operation.

### Caveats

- This build was tested locally with simulated Firestore transactions and Razorpay responses, **not** production charges or production Firebase account data. Never enter live secrets into source code or chat.
- Firestore coupon quotas count reserved percentage-discount checkouts. Cancelled checkouts release reservations, but old unreconciled browser sessions may temporarily hold a coupon slot and need operator review.
- Newly generated free reports use the enhanced skill section; older saved versions remain as generated.
