# Career Buddy V5.3 — Assessment-First Journey

**Project:** AI Early Career Guide — Career Buddy  
**Repository:** `aiearlycareerguide-career-buddy` (independent of the Student, existing Professional Assessment and Recruiter applications)  
**Release status:** controlled-owner preview; real OpenAI/Firebase/Resend may be enabled on the separate testing deployment; **NO LIVE PAYMENTS**.

## What's new from V5.2

The landing page has **only two choices**:

1. **Free Career Discovery** — verify email, complete ten short guided questions, generate/download a free snapshot.
2. **Premium Career Assessment** — verify email, complete the **same free foundation first**, generate/view the free snapshot, then proceed to the indicative ₹499 detailed assessment. No free questions are repeated. Resume paste/skip remains the first paid assessment step.

**After the free snapshot:** show **two next steps**, Premium Career Assessment (₹499 indicative) **or** Career Buddy Coaching (₹149 introductory 15-interaction pack indicative). The coach is **not** an entry choice on the landing page and **cannot be used until a saved free snapshot exists**. The saved profile and, when present, detailed report accompany the coaching conversation.

**After premium:** the detailed report retains technical and soft skills, evidence-based recommendations, 30/60/90-day development, learning resources and interview practice; optional resume review / editable Word and PDF exports remain. Premium Starter includes 60 coaching interactions, usable after the report. Standard refill ₹249/35 interactions, Extended refill ₹399/75 interactions; all values are preliminary.

## Key implementation rules

- Server-side `intro`, `starter` and refill pack entitlement checks require the free snapshot. Chat requests also enforce the assessment gateway, even if someone bypasses client navigation. Legacy test sessions holding credits but missing a snapshot must complete discovery before they can chat.
- Journey choice is saved per **verified email** in Firestore (`journeyPreference: 'free' | 'premium'`). Reloads and re-verification resume the saved journey, subject to what has been completed.
- A user who selects Premium from the first screen **still completes free discovery**; a paid order is not offered prematurely. The free report remains downloadable under **My reports** at every later stage.
- After completing the free snapshot, both paid options appear together. Users can navigate via Home or My reports without losing answers, history, credits or reports.
- During coaching, the saved career profile, free snapshot summary and any generated premium report summary are passed to the AI as labelled user-provided context. The assistant does not repeat the structured intake.
- Nonsensical/off-topic successful responses use **one credit**; obvious junk can receive a low-cost local redirect. Errors, blocked duplicates and invalid messages remain free.
- Free role guidance retains the existing cross-user **role-only** cache. Do not cache identifiable user profiles or resume contents. One free report per verified email in owner testing remains controlled by daily free-report caps.
- Previous snapshots, paid reports, optional resume exports, discount coupon **test** calculations, download history, credit warnings and mobile-first layout remain intact.

## Deploy in the *separate* Career Buddy project

1. Download `AI_Early_Career_Guide_Career_Buddy_V5_3.zip` and unzip. Upload **the contents inside** `aiearlycareerguide-career-buddy-v5-3/` into the root of the **private** GitHub repository `aiearlycareerguide-career-buddy`, replacing V5.2. Do not upload the enclosing folder as the app root.
2. Deploy via your existing separate Career Buddy Vercel project. **Do not change** Student, Professional Assessment or Recruiter repos/deployments, and do not move DNS or the primary site's routes.
3. Keep the existing **Career Buddy only** environment settings: `PREVIEW_ACCESS_CODE`, `PREVIEW_SESSION_SECRET`, `OWNER_RESET_CODE`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. Enter secrets in Vercel, **never** in source control or chat. Use an independently verified Resend sender. Retain `FREE_REPORT_DAILY_LIMIT` and optional cost rate settings `OPENAI_INPUT_USD_PER_MILLION`, `OPENAI_OUTPUT_USD_PER_MILLION`, `OPENAI_USD_INR`. `PREVIEW_COUPONS_JSON` is optional for test coupons only.
4. Keep the deployment **protected** and checkout **simulated**. The test purchase action grants preview credits with no actual Razorpay transaction. Do not release publicly with mock purchases.
5. Run `npm test` locally if Node 20+ is available. The browser fixture is `python tests/browser_flow.py` (requires Playwright and Chromium); it mocks backend responses, so it does **not** replace live integration testing.
6. Open the updated **separate** Vercel preview, hard refresh, and complete the checklist below.

## Owner testing checklist

- New email → Free Career Discovery → 10 questions → Generate Snapshot → View/Download PDF → see **Premium Assessment and Career Buddy** choices.
- New email → **Premium Career Assessment** at welcome → first the **same free questions** → free snapshot → Premium → test starter purchase → optional pasted resume first → remaining paid questions → detailed report / resume downloads. No repeated free questions.
- From the free snapshot → **Career Buddy** → preview introductory pack → ask a useful question; confirm profile context and one-credit deduction. Return Home and choose Premium; free responses must remain saved.
- Attempt to visit Career Buddy before a free snapshot (including a preview user whose old credits have persisted). It must not unlock. Similarly a backend `mockPurchase('intro')` without a snapshot must be rejected.
- Sign out, verify the **same email**, and confirm the intended journey and saved reports persist. My reports must still show Free Career Snapshot after upgrade.
- Test both 390px mobile width and desktop. Navigation should return to the top of the next screen; check that neither options nor chat overflow horizontally.
- Try approved test coupons, standard/extended refills, low balances 10 / 5 / 1 / 0, technical failures, an off-topic successful response, optional resume skip/return, interview content and cost logs.

## Checks in this package

- **53 Node tests passed**, including 6 new V5.3-specific tests for assessment-first access, paid entitlements, snapshot continuity and stored journey selection.
- **Browser fixture passed on desktop and mobile:** premium selected at welcome, free screening completion, PDF action, coach purchase & chat after snapshot, navigation back to premium with preserved state, optional resume screen, existing My reports, and email-verification path. No horizontal overflow.
- These results are **local tests**. Real deployed OTP delivery, Firestore read/write permissions, AI answers/costs, live PDF generation, coupons and concurrent user handling **remain to be verified** on Vercel.

## Release blockers (unchanged)

- **Real Razorpay checkout is NOT enabled**. Implement verified payment orders and webhooks, idempotent entitlement and credit grants, refund paths and coupon/invoice/tax handling before enabling paid traffic.
- Keep preview access protected; complete production authentication hardening, abuse/IP throttling, user privacy/deletion, data retention, monitoring, cost budgets and load testing before public access.
- The **separate Professional Assessment import** remains planned, not yet connected. Only Career Buddy's own free/paid context is transferred in this build. A future consent-based signed import can be added without modifying live applications until explicitly approved.
- Prices and credit allocations are provisional until measured AI usage and customer conversion tests validate contribution margins.

## Source files

- `index.html`, `style.css`, `app.js`: two-choice welcome, free snapshot decision screen, responsive coaching and saved navigation.
- `api/service.js`: email verification, stored journey preference, gated chat and preview purchases, saved reports and usage logs.
- `api/_lib/domain.js`: server-side coaching/assessment pack eligibility.
- `api/_lib/quickflow.js`: nonrepeating free and paid guided questions.
- `api/_lib/free-snapshot-content.js`: role-only guidance cache.
- `api/_lib/report-v4.js`, `api/_lib/resume-documents.js`: Professional-style detailed report and optional resume.
- `tests/v5-3-journeys.test.js`, `tests/browser_flow.py`: new journey regressions.
