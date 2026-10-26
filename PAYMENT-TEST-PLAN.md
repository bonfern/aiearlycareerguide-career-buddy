# Career Buddy V5.15 — Live purchase verification plan

**Status:** The automated browser tests simulate Razorpay callbacks. They have not processed any live funds or verified your production Firebase/Razorpay/Resend configuration. Complete the following tests after deploying V5.15 and approving the Career Buddy Privacy, Terms and Refund wording.

## Before any paid checkout
1. Verify `https://www.aiearlycareerguide.com/professionals/` and `/professionals/api/service?action=config` are working. Confirm public mode, correctly configured live payments, and no errors.
2. Verify all new Career Buddy information pages (`/professionals/know-more.html`, `faq.html`, `privacy.html`, `terms.html`, `refund.html`, `contact.html`) load correctly, and main-site home navigation works. Have the owner review policies: these are drafted product-specific texts, not legal certification.
3. On Vercel Career Buddy Production, confirm `PAYMENT_FLOW_MODE=razorpay_live`, `LIVE_PUBLIC_MODE=1`, `LIVE_PRIVATE_MODE=0`, preserved Firebase/session secrets and production Razorpay keys. Never paste their values into chats or commits.
4. Configure one new **Live** Razorpay webhook for Career Buddy with `payment.captured` and `order.paid`, signing secret identical to `RAZORPAY_LIVE_WEBHOOK_SECRET`. Prefer `https://www.aiearlycareerguide.com/professionals/api/razorpay-webhook` after confirming the main-site reverse proxy; the direct Vercel app endpoint is also suitable. The webhook must be reachable by Razorpay and not blocked by authentication/deployment protection.
5. For non-zero payable orders only, enable `LIVE_PAID_CHECKOUT_ENABLED=1` once you expressly intend to make authorised live payments, and redeploy. Real funds can be charged. Leave `=0` while preparing.

## A. ₹499 Premium Career Assessment (use a fresh verified email)
1. Complete the seven-question Free Career Discovery. Change at least one earlier answer with Previous and verify the updated profile; generate and download the free snapshot.
2. Select Premium Career Assessment. Verify displayed base price ₹499, applicable discount, and final payable amount in Razorpay. **For a true live test, use an authorised real-money transaction.**
3. Confirm Razorpay Live Dashboard marks payment **captured**. Complete checkout and verify app unlocks the competency assessment without a resume step and grants exactly **40** coaching credits.
4. Close and reopen the site, verify email and assessment progress, and confirm no repeat purchase; refresh/check status should not double grant.
5. Complete 12–15 paid questions, generate the detailed report without any resume section. Download the report PDF. Confirm credits are not deducted for assessment questions.

## B. ₹149 Career Buddy Intro (use a **different fresh verified email**)
1. Complete Free Career Discovery and get the free snapshot.
2. Select Career Buddy Coaching (not the Premium Assessment). Check intro pack price ₹149 and 12 coaching credits / 14-day validity.
3. Make a separately authorised live payment. Verify Razorpay capture, secure entitlement and **12** coaching credits.
4. Ask one legitimate coaching question, confirm balance becomes **11**; verify re-login restores messages and remaining credits.
5. Verify coaching does not accidentally unlock the Premium detailed assessment. Refill packs can be tested separately after this.

## C. Ayesha resume review and complimentary owner coupon
- From any eligible paid pack, open Ayesha coaching. Paste a sample resume (up to 16,000 characters) into the dedicated review tool. Confirm five credits are deducted only after completed feedback and the separate resume-review PDF downloads. Verify the normal 1,200-character question limit does not apply to this tool.
- If `LIVE_FREE_COUPON_CODE`, `LIVE_FREE_COUPON_EMAILS` and the usage caps are configured, use two approved verified emails to test the Premium and Intro entitlement paths without Razorpay checkout. Both must show ₹0 payable, grant the correct pack only once and record a complimentary entitlement.
- Reusing the same pack/coupon/email should fail without duplicate credits. A non-approved email should be rejected.
- Do **not** interpret a complimentary redemption as verification of Razorpay capture, webhook delivery, bank settlement or refunds.

## D. Failure and recovery controls
- Cancel checkout before paying → no credit grant. A pending checkout can be checked/recovered without a double charge.
- Successful payment followed by closing the browser → the signed Razorpay webhook and/or payment-status check must restore the entitlement after verifying capture.
- Webhook replay / duplicated `order.paid` and `payment.captured` → one entitlement only; no double credits.
- Failed or uncaptured payment → zero new credits; no report/paid access.
- Incorrect coupon or expired/unauthorised 100% coupon → no free access or charge without explicit user confirmation.
- Reconcile Razorpay order/payment IDs against Firestore `buddyLivePayments`, `buddyLiveEmailSessions` and relevant coupon ledger collections. Confirm correct pack and actual amount.
- Check Vercel function logs, Razorpay webhook delivery details, Firebase logs and OpenAI usage. Do not upload raw resume or user email data in support screenshots.

**IMPORTANT:** The previous Professional Assessment can be retired from customer navigation, but retain its deployment/configuration for rollback until Career Buddy is stable. Student and Recruiter applications are unchanged.
