# Career Buddy V3 — Free Snapshot → Paid Coaching (OWNER PREVIEW)

**AI Early Career Guide: separate `aiearlycareerguide-career-buddy` repository / Vercel project / Firebase project.** No changes to existing Student, Professional or Recruiter code or databases.

> **IMPORTANT: This version is for protected owner testing only. There is NO live checkout or customer authentication. Its "Activate Starter" and "Refill" buttons merely simulate purchases and issue test credits. Do not publicly launch, promote as a live product, or accept payments until Razorpay payment verification, identity, anti-abuse controls and production credit accounting are implemented.**

## What is new in V3

1. **Free discovery:** One question at a time, ten simple guided questions (industry is optional). All free answers update the same saved career profile. Free screening does **not** call OpenAI.
2. **Free report:** One concise **Career Snapshot** per preview session, user-triggered only after sufficient screening context. It has exactly four sections: (1) short professional profile summary; (2) target role competencies; (3) **five** general action recommendations; (4) what further assessment is needed before identifying exact competency gaps. A free report NEVER claims to have measured or validated personal gaps.
3. **Paid continuation:** Simulated owner-preview Starter unlocks **60 test interactions**, without losing any answers. The guided flow automatically starts with *unanswered* deeper questions (learning constraints and two experience examples). The full report remains gated by detailed evidence. After generating the full report, the customer can continue using unused valid chat credits.
4. **Indicative packages:** Starter **₹499 / 60 interactions / 30 days**; Standard Refill **₹249 / 35 / 30 days**; Extended Refill **₹399 / 75 / 60 days**. Server computes pack prices; test top-ups add credits to the same session and extend expiry from the later of current expiry or today.
5. **Coupons:** Preview coupons are optionally configured in Vercel using a JSON environment variable. Server validates discounts and stores *simulated* orders. Real Razorpay coupons and payments are **not implemented**.
6. **Career Toolkit:** Paid full-report users can request **profile-based resume improvements** (no file uploads) and a **12-question role-specific interview bank**. Interview banks are cached in a separate `buddyInterviewBanks` Firestore collection by normalised target role and industry. Shared cache contains generic role-level questions, NOT the user's personal profile.
7. **Costs:** OpenAI token usage and estimated INR costs recorded for free snapshots, coaching, included full reports, resume guidance and interview bank cache misses. Free reports are additionally capped globally per UTC day in this owner preview.

## Required setup

1. Extract ZIP into the **existing separate repository** `aiearlycareerguide-career-buddy`, replacing Version 2.1 files while preserving the `api/_lib` and `tests` folders. Do **not** upload into your existing Professional Assessment repo.
2. The **existing separate Career Buddy Firebase project** continues to work. No Firebase migrations needed: V3 adds optional fields to `buddyPreviewSessions` and creates collections `buddyPreviewLimits` (free-report budget), `buddyPreviewOrders` (simulation), and `buddyInterviewBanks` (role-based cache). Older V2 sessions retain paid preview behaviour; start a new session to test the free entry flow.
3. Deploy this repository to its **existing separate Vercel project**. Retain these Vercel environment settings, only on Career Buddy: `PREVIEW_ACCESS_CODE`, `PREVIEW_SESSION_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and cost variables `OPENAI_INPUT_USD_PER_MILLION`, `OPENAI_OUTPUT_USD_PER_MILLION`, `OPENAI_USD_INR`. Verify actual model and rates, and configure OpenAI project spend limits.
4. Recommended optional Vercel settings (in Career Buddy only): `FREE_REPORT_DAILY_LIMIT=25` and `PREVIEW_COUPONS_JSON={"EARLY30":30,"TEST100":100}`. `TEST100` is for private owner testing only. Environment values must be set through Vercel settings, NOT committed to GitHub.
5. Enable Vercel Deployment Protection; private preview access code is a **shared testing gate**, not an appropriate production login or anti-bot defence.
6. Run `npm test` with Node 20+; tests cover intake, input lengths, report gates, pricing, discount validation and free-to-paid carryover.

## Acceptance test — run in this order

1. Open the protected test URL **in a private/incognito browser window** (or clear cookies for the Career Buddy test domain only), enter the preview access code and begin a **new** session. Existing V2 test cookies intentionally retain their earlier preview credits and do not start the new free funnel. You should see **Free Career Discovery**, not 60 free credits.
2. Answer ten short questions, with an optional industry skip. Verify **Generate free report** is locked until required profile topics are covered. A job-specific target role such as *Director of Process Excellence* improves the usefulness of competency guidance.
3. Generate the free report. Confirm **exactly four sections**: summary, role competencies, five general actions, and areas for further assessment. No actual personal gap scores. Try refreshing: report remains saved; generating it again does not trigger another AI call.
4. Observe the **Starter ₹499** owner-preview offer. Optionally enter `EARLY30` (if configured) and click **Simulate Starter Unlock**. No real money is collected.
5. Confirm previously answered free questions are **not repeated**. The next Quick Answer should be learning-time constraints or another genuinely missing paid topic.
6. Complete two short evidence examples and generate the detailed career development report. Chat interactions remain available; generating the report consumes **zero** chat credits.
7. After full report, open **Resume Improvements** and **Interview Preparation**. Resume guidance should be based on the saved profile and should not invent achievements. Interview bank should show twelve target-role questions with preparation hints.
8. Ask an on-topic career question in **Ask Career Buddy** and confirm the successful AI response consumes one test credit. Try a short resume bullet, with personal contact details removed. Select top-up to add more test credits; the same career context remains.
9. Check Firestore: `buddyPreviewUsage` has per-call token/cost records. For interview banks, the first role/industry generates a cached bank; additional users with the same role reuse it without new AI spending. Cost estimates show “unpriced” if model rates are missing.
10. Confirm remaining-credit alerts at **10, 5, 1 and 0**, plus expiry warnings, and report/history availability after credits run out. Before public launch, also test simultaneous requests, retries, forced failures and rate limits.

## Limits and privacy

- Quick-choice answers do **not** spend an AI request or credit. Paid AI chat consumes one test credit per successful career-related reply. Rejected/off-topic messages are not billed to the customer but can still incur API cost.
- User messages max **1,200 characters**. Guided experience examples max **300**; role/other fields max **120**. Server validates every question and answer; no file upload feature.
- Free snapshot is one per private preview session; the **global daily preview quota** provides additional protection but is not a substitute for production per-user verified quotas and bot protection.
- Guidance is based on self-reported inputs. Interview questions are representative preparation questions and never guarantees of what an employer will ask.
- Do not send API keys, Firebase service accounts or sensitive resume/assessment data in the chat. Vercel environment variables should be private.
- **Existing Professional Assessment report import is NOT connected yet.** Carryover from this new free Career Buddy screening to paid Career Buddy is implemented; cross-product import requires a separate signed, consented handoff. Never connect the live Professional Firebase project directly to this preview without the required design and permissions.

## Before going live

Production needs secure email-based identity, enforceable per-person free report limits, CAPTCHA/rate limiting, verified Razorpay order creation/webhooks (idempotent credit grants), coupon rules, refunds and expiry policies, privacy notices and user data deletion, accurate per-model cost measurement, QA on real API outputs and secure assessment-to-coaching migration. The *simulated purchase endpoint must be removed/disabled* before public launch.

## Key files

- `api/_lib/quickflow.js` — 10 free guided questions, plus deeper paid questions and deterministic validation.
- `api/_lib/domain.js` — pricing/coupons, profile merging and two report readiness gates.
- `api/service.js` — private preview API, free report, test order/refills, paid coaching, detailed report, resume guidance, cached interview bank and cost ledger.
- `index.html`, `app.js`, `style.css` — responsive branded UI and report dialogs.
- `tests/` — pure automated tests (`npm test`).
