# Career Buddy V5 — two clear entry paths, one verified email identity

**By AI Early Career Guide** — independent application for the private repository `aiearlycareerguide-career-buddy`. Does **not** change the Student, Professional Assessment or Recruiter repos, Firebase projects, or Vercel deployments.

**Status:** owner-only V5 for a **controlled live-AI test** using real OpenAI, Firebase and Resend once the new Vercel deployment has those environment variables. **NO LIVE PAYMENTS.** Pricing, validity and entitlements below are test/indicative. Owner must deploy; creating this ZIP does not update the live Vercel application.

## User experience

1. **Welcome:** Two explicit routes. `Career Assessment` (free first, optional paid upgrade) or `Ask Career Buddy` (a separate lower-priced direct-coaching purchase). These remain switchable from Home. The welcome, free-snapshot and direct-coaching offer show AI-generated professional imagery; logo is a separate brand asset. All screens are single-column/mobile-first; right sidebar is removed.
2. **Verified email:** A unique normalized email address is verified with a six-digit one-time code via Resend. The same email restores saved progress in Firebase; cookie is HTTP-only and signed. A protected owner-only reset enables repeat testing without allowing customers to farm free snapshots.
3. **Free route:** Ten mostly quick-choice questions, followed by one concise **Free Career Snapshot**: professional profile summary, required target-role competencies, five generic actions, and the evidence needed for a deeper assessment. Snapshot can be viewed and downloaded as an A4 PDF immediately or later under **My reports**, even after upgrading.
4. **Detailed assessment route:** Starts at **₹499 / 60 chat interactions / 30 days** (test only). The full free assessment/snapshot must be completed first, and answers already stored are NOT asked again. First paid step is **optional pasted resume** (100–12,000 characters or explicit Skip). Detailed questions cover missing constraints and work evidence only. `Generate detailed report` is accessible only once adequate structured context and resume decision are available. Report does **not** consume chat credits, and unused credits remain usable for coaching subject to validity.
5. **Detailed report:** Reuses the earlier Professional Assessment structure and branding. Contains technical **and soft/behavioural** skills, evidence-grounded priorities, skill-by-skill actions, unassessed capabilities, 30/60/90-day plan, learning recommendations, practical-evidence checklist, and 10 cached-by-role interview questions with individual answer frameworks. Report narration addresses the reader and avoids repeating their name. Resume analysis is included when resume was pasted.
6. **Resume:** Optional, not a prerequisite to the detailed report. When pasted, the user can generate a professional, impersonal, ATS-friendly draft and download **Word** or **PDF**. The system must not invent employers, dates, metrics, awards or qualifications. A skipped resume can be pasted later; source text contact details are redacted before saving. Users must review all resulting facts.
7. **Direct coaching route:** An **indicative ₹149 / 15 interactions / 14 days** standalone introductory package. Users can ask professional career questions without completing an assessment. Server-side scope guard directs unrelated requests back to career topics. Direct-coaching credits do **not** unlock the paid assessment report. Users can later complete the free assessment and buy the ₹499 assessment pack to add credits and unlock that separate entitlement.
8. **Continuity/refills:** Standard ₹249 / 35 interactions / 30 days, Extended ₹399 / 75 / 60 days. Both test-only. Server validated coupons via `PREVIEW_COUPONS_JSON`. Warnings at 10 / 5 / 1 / 0. Chat history and reports retained, and user can always revisit My reports. Prevent repeat/cross-purchase entitlement fraud through backend checks.

## Deploy to your separate Vercel project

1. Download V5 ZIP, unzip, and upload **the extracted contents** (not an enclosing folder) to your private GitHub repo `aiearlycareerguide-career-buddy`. Replace earlier V4 application files; retain your separate Career Buddy Firebase and Vercel project. Vercel then redeploys if GitHub integration is enabled.
2. Set / retain these **only in the independent Career Buddy Vercel project's Environment Variables**: `PREVIEW_ACCESS_CODE`, `PREVIEW_SESSION_SECRET` (long secret, at least 24 characters), `OWNER_RESET_CODE` (different long secret), `FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. Never place these values in GitHub or chat. Resend must be configured with a verified sender.
3. Set `FREE_REPORT_DAILY_LIMIT=25` or a stricter value while measuring cost. Set correct per-model cost assumptions in `OPENAI_INPUT_USD_PER_MILLION`, `OPENAI_OUTPUT_USD_PER_MILLION`, `OPENAI_USD_INR`, otherwise AI usage is recorded as **unpriced**, not fictitious rupee costs. Optional preview coupon config: `PREVIEW_COUPONS_JSON={"EARLY30":30,"OWNERTEST":100}` (examples; create your own).
4. **Keep Vercel deployment protection enabled** and invite test users only. Confirm the new app is hosted in the Career Buddy Vercel project; don't repoint production website routes or the three existing projects.
5. Run `npm test` with Node 20+. Note: this verifies deterministic logic, document generators and static route presence, not deployed OTP delivery, Firebase permissions, actual AI output or live checkout.
6. Test on desktop and mobile: new email; correct/incorrect OTP; free ten-answer sequence; view/download free PDF; sign out/reverify same email; My reports after moving to later steps; starter test with coupon; resume skip first; additional questions; report readiness; detailed branded PDF; paste resume later, download DOCX/PDF; generate interview question bank; post-report chat; return home and switch paths; direct-coaching intro; refills; exhausted credits; owner reset. Confirm stage transitions reset scroll to page top.

## Important release blockers

- **Payments are simulated** with `mockPurchase`; **do not expose to paying customers**. Real Razorpay integration requires server-verified orders/webhooks, idempotent credit grants, refund and coupon rules, invoice/tax handling.
- For any **public** deployment, complete bot/CAPTCHA and IP-based rate limits, privacy/retention and deletion workflows, email verification load tests, content/safety review, resilience under real traffic, per-account API budgets and abuse monitoring.
- Free reports are bounded by daily server quota and one per verified email but email aliases/automation may still be abused without additional public antifraud controls.
- The **Professional Assessment import** remains separate and unimplemented; a consented, signed cross-product handoff must be developed and tested, without altering the live Professional Assessment.
- Price and number of interactions are indicative until real cost tests and conversion analysis are complete. The new coaching intro is a product hypothesis, **not** a final commercial price.

## Main source files

- `index.html`, `style.css`, `app.js`: staged responsive UX and two user paths.
- `api/service.js`: verified email, session persistence, free/paid/report routes, direct-coach entitlements, refunds not enabled, token usage and test purchasing.
- `api/_lib/domain.js`: pack pricing and eligibility, limits and report-readiness logic.
- `api/_lib/quickflow.js`: ten free questions and contextual paid follow-ups.
- `api/_lib/free-snapshot-pdf.js`: new branded downloadable free A4 snapshot.
- `api/_lib/report-v4.js`, `pdf-report.js`, `report-brand.js`: detailed Professional-style report, updated soft skill and second-person report instructions.
- `api/_lib/resume-documents.js`: Word/PDF resume exports.
- `tests/v5-product.test.js`: additional tests for direct coaching, free PDF and distinct user paths.

## Local validation for V5

- 37 automated Node tests passed.
- Static desktop and mobile browser fixtures checked with Chromium: no JavaScript errors, no horizontal overflow, no unexpected scroll position; verified the free-question option layout. These fixtures simulate authenticated state, **not** actual OTP/API usage.
- One-page A4 free snapshot PDF sample exported and rendered/read successfully.
- Real Vercel, Firebase, Resend and OpenAI behaviour must be tested after deployment; neither the source ZIP nor static screenshots constitute a live deployment.
