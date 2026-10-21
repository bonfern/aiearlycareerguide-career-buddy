# Career Buddy V4 – Verified Email → Free Snapshot → Detailed Professional Report → Optional Revised Resume

**A separate application for AI Early Career Guide** (`aiearlycareerguide-career-buddy`). This release does not alter Student, Professional Assessment or Recruiter code/deployments. **Protected owner preview only. No real payments.**

## The agreed user journey

1. **One unique, verified email identity.** User enters their email and the private preview access code. Career Buddy sends a six-digit one-time code via Resend (valid for 10 minutes). After verifying, the user starts or resumes the *same* Firestore career profile, answers, reports and credits. Simply typing another person's email never exposes that person's record.
2. **Free discovery.** Ten guided, short questions, with quick choices by default and brief free text as needed. The free Career Snapshot contains only (a) profile summary, (b) target-role competencies, (c) five generic actions, and (d) further assessment areas. It never reports validated skills gaps. One free snapshot per verified email, subject to a global free-report daily cap.
3. **Detailed paid exploration.** The ₹499 / 60-interaction Starter (simulated in this preview) continues with the exact same profile and asks *only new, deeper questions*. The model does not repeatedly ask answered profile questions.
4. **Optional pasted resume.** Once the paid profile has sufficient evidence, the user can paste resume text (100–12,000 characters) or explicitly skip; no resume file upload. Email and phone patterns are redacted from saved resume text. The report remains available to users who skip; they can return later and paste a resume for a separate revised resume draft.
5. **Detailed Professional Assessment-style career report.** One included user-triggered report, never costing a coaching credit. The layout, header, logo, styling and core sections reference the supplied Professional Assessment repository PDF report. Career Buddy adds role-specific interview preparation and optional resume analysis. Self-reported evidence is NEVER described as a verified test result.
6. **Revised resume.** If resume text was provided, the user can generate a revised resume from the original text and assessed goals. Review suggested changes and missing evidence, and download editable **Word (.docx)** or **PDF**. The AI must not invent employers, dates, achievements or qualifications.
7. **Continue coaching.** Users can keep asking career questions until interactions are used or time validity expires, including after report generation. Credit warnings at 10 / 5 / 1 / 0. Refills add to the same profile and conversation: ₹249/35 credits (30 days) and ₹399/75 (60 days), prices indicative. Coupons supported in preview.

## Detailed report contents (mirrors the supplied Professional Assessment design)

- Career summary and specific goal.
- Technical and leadership/behavioural competencies expected in the target role.
- Career execution route with actions and outcomes.
- Skill-by-skill development plan: expected benchmark, current self-reported evidence, development priorities, 2–3 practice actions, practical evidence task and improvement indicator.
- Additional high-priority capabilities not yet assessed, with suggestions for how to verify each.
- An integrated 30/60/90-day career and learning plan.
- Progress/evidence checklist and relevant learning recommendations.
- **NEW:** ten role-specific interview questions, what interviewers assess and answer frameworks. A generic, privacy-safe interview question bank is cached by role and industry; private answer guidance is generated individually.
- **NEW:** resume improvement observations only when resume text was provided; otherwise clearly marked optional.

The server produces a **branded A4 PDF** using an adapted copy of the renderer and embedded brand logo from the user-supplied Professional Assessment repository. The section structure is intentionally equivalent, but competency ratings are not copied across because Career Buddy does not administer the same tested assessment. If the current live Professional report differs from the supplied October 9 source ZIP, compare its latest changes before public launch.

## Deploy safely

1. Download this ZIP and extract **all** files into the *existing independent* GitHub repository `aiearlycareerguide-career-buddy`, replacing V3 files. Do not upload V4 into your Professional Assessment repository.
2. Keep the separate Career Buddy Firebase project and Vercel deployment. No migrations to existing products. V4 uses Firestore collections **`buddyEmailSessions`, `buddyLoginChallenges`, `buddyInterviewBanks`, `buddyPreviewUsage`, `buddyPreviewOrders`, `buddyPreviewLimits`**. V3 `buddyPreviewSessions` remain untouched, but the old anonymous sessions are **not automatically migrated** to verified emails; start a new verified-email test session in V4.
3. In Career Buddy Vercel **Environment Variables**, retain `PREVIEW_ACCESS_CODE`, `PREVIEW_SESSION_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, and `OPENAI_MODEL`. `PREVIEW_SESSION_SECRET` must be at least 24 characters and should be a long random value. Changing it will require testers to sign in again.
4. Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (sender on a verified Resend domain). Resend credentials must be entered in the separate Career Buddy Vercel project, not put in ZIP or chat. Set `OWNER_RESET_CODE` to a separate, strong secret for the owner-only test reset button. Configure `FREE_REPORT_DAILY_LIMIT`, cost-rate environment variables and optional `PREVIEW_COUPONS_JSON` as shown in `.env.example`.
5. Keep Vercel Deployment Protection enabled. Deploy. You must verify email to access the test application. OTP delivery requires a working Resend account with a verified sending domain.
6. Run `npm test` (Node 20+), then test the deployed UI and documents end to end. The tests cover offline business logic and sample document exports but **do not substitute for live Firebase/Resend/OpenAI tests**.

## Test cases to complete before launch

- Test new email → receive code → verify → start free intake. Sign out, reopen and verify the same email; answers should resume at the next unanswered question.
- Try an invalid code, an expired code, wrong email and six consecutive guesses. Invalid OTP attempts are limited; emails can be requested at most once per minute per email and up to five times per hour.
- Generate one free snapshot. Refresh and sign back in with the same email: no extra free AI call, existing snapshot reappears. Try different browser sessions with the same email.
- Simulate Starter upgrade (including coupon); confirm earlier free answers carry forward and are not repeated.
- Enter two meaningful project examples. Paste a resume (100–12,000 characters) and generate the detailed report; verify every original Professional Assessment section, interview questions, and personalised resume comments. Then download the branded PDF.
- Repeat with **Skip Resume**; the detailed report should still unlock without inventing resume insights. Return later, paste a resume, generate the draft, download DOCX/PDF, and check all facts.
- Generate the report at a nonzero credit balance; verify no deduction. Check post-report chat, expiry, warnings and refill behaviour.
- **Owner-only test reset:** sign in with the tester email, select **Reset this test session**, provide `OWNER_RESET_CODE`, and confirm. This clears test career data/credits for that email only; the global usage log and daily free-report budget are retained.
- Inspect Firestore `buddyPreviewUsage` for free snapshot, interview cache miss, full report, revised resume and paid chat token costs. Set real model token prices first; costs are unpriced if pricing variables are zero.

## Not yet implemented / production blockers

- **Live Razorpay payments are disabled.** The Starter/refill buttons *simulate* credits and must not be enabled publicly. Next phase: verified payment orders/webhooks, idempotent credit grants, refunds, real coupon approval and pack entitlements.
- Login and email quotas have preview controls; public deployment still requires bot/CAPTCHA controls, IP-based throttling, privacy/retention and deletion workflows, abuse monitoring and security review. Email normalization is not a general identity-federation mechanism.
- **Import from the existing Professional Assessment is not yet connected.** It requires a separately designed, consented, signed cross-product handoff and minimal changes to the source product. No existing database is read by this V4 preview.
- Live end-to-end testing with your Firebase/Resend/OpenAI configuration is pending. User-generated report quality, Word/PDF layout for long resumes, conversions and actual costs must be evaluated with representative cases.

## Files

- `api/service.js` – verified-email workflow, coaching, report, optional resume, test purchases, usage and exports.
- `api/_lib/report-v4.js` – detailed report schema, required sections, responsible competency language, model instructions.
- `api/_lib/pdf-report.js`, `report-brand.js` – adapted Professional Assessment PDF layout and original brand asset.
- `api/_lib/resume-documents.js` – dependency-free Word DOCX and PDF exporters.
- `api/_lib/identity.js` – email normalization, OTP signature/expiry, cookie identity.
- `api/_lib/domain.js`, `quickflow.js` – credit, pricing, profile and guided-question rules.
- `index.html`, `style.css`, `app.js` – simplified one-column experience.
- `tests/` – Node unit tests.
