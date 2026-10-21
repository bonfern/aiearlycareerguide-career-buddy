## Version 2.1 hotfix (21 October 2026)

The previous server validator rejected legitimate progressive-tense work descriptions such as **"building an AI chatbot for HR queries"**, causing users to get stuck on the second experience question. This release expands action-verb recognition to ongoing responsibilities, reduces the minimum example length from 24 to 18 characters, and provides a clear inline example. A project does **not** need to have finished or delivered a quantifiable result to count as self-reported experience; it still is not a verified outcome.

**Deploy:** Replace the Version 2 files in the separate `aiearlycareerguide-career-buddy` repository with this ZIP's contents. No new environment variables, Firebase migration, secret changes, or changes to the live Student, Professional, or Recruiter applications are required. Wait for Vercel deployment and then reload the chat. The original response "building an ai chatbot for th HR queries" will be accepted.

**Existing progress:** Preview session history and credit balances are left untouched. The changes only affect validation and question wording. No new Firestore collections are required.

# Career Buddy by AI Early Career Guide — Version 2.1 (Quick Answer Fix)

**Separate owner-preview application.** This code is for the existing new repository `aiearlycareerguide-career-buddy`. It does NOT modify or share customer data with the live Student, Professional or Recruiter apps. No production billing is enabled.

## What changed from Version 1

1. **Quick Answers (default):** One short career question at a time; single-choice, multi-choice or very short text. Core questions are server-authored and server-validated (not arbitrary AI-generated options). An optional industry question can be skipped.
2. **Ask Career Buddy:** Switch to AI free chat whenever needed. The AI answers the career question first, keeps replies brief, and must not ask multi-part questionnaires. Free chat still has a 1,200-character limit.
3. **Shared career profile:** Both response styles update the same structured profile. Quick Answers skips areas that free chat has already covered. Choices are stored in Firestore; user selections are never trusted as client-authored facts.
4. **300-character achievement responses:** Achievements require a short concrete sentence describing an action/result. No long essay required. Job title is max 120 characters. "Other" is max 120 characters.
5. **Report readiness:** Generate Report remains server-locked until all eight coverage requirements are met, including two meaningful examples. User can trigger the included report; it costs zero chat credits. Afterwards, any remaining chat credits remain usable.
6. **Credit economics:** Plain Quick Answers submit **no OpenAI request and use zero test coaching credits**; AI Free Chat uses one preview credit for each successful on-topic interaction. Real payment/charging policies remain subject to cost testing. An off-topic AI call can incur actual API expense even when no credit is deducted.
7. **Cost measurement and warnings:** Existing token-cost logging, 60 test credits, indicative pricing, and 10/5/1 credit warnings remain unchanged.

## Deploy Version 2 without touching existing apps

1. Extract `AI_Early_Career_Guide_Career_Buddy_V2.zip` on your computer.
2. Open your **new Career Buddy repository** on GitHub, `aiearlycareerguide-career-buddy`. Replace the Version 1 files with the Version 2 files **in the same repository**. Preserve nested folders `api/_lib` and `tests`.
3. This upgrade **does not require a new Firebase project** if you already created the separate Career Buddy Firebase project. It continues to use `buddyPreviewSessions` and `buddyPreviewUsage` in that project. Existing V1 preview sessions can open the V2 page; new Quick Answers state is initialised lazily. Do not connect it to your live Professionals database.
4. In your existing **separate Career Buddy Vercel project**, confirm its GitHub repository is `aiearlycareerguide-career-buddy`, and redeploy after the push. Do not deploy into any Student / Professional / Recruiter Vercel project.
5. Keep the following Vercel environment variables, already used by V1, in the **Career Buddy project only**:

| Environment variable | Notes |
|---|---|
| `PREVIEW_ACCESS_CODE` | Private owner-preview access code |
| `PREVIEW_SESSION_SECRET` | At least 32 randomly generated characters |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Service account for NEW Career Buddy Firebase project, private |
| `OPENAI_API_KEY` | Owner-testing API key with spend limits |
| `OPENAI_MODEL` | Supported Chat Completions JSON-output-capable model; V1 default is `gpt-4.1-mini` |
| `OPENAI_INPUT_USD_PER_MILLION` | Verified current model input price; set 0 until verified |
| `OPENAI_OUTPUT_USD_PER_MILLION` | Verified current model output price; set 0 until verified |
| `OPENAI_USD_INR` | Verified exchange-rate assumption; set 0 until verified |

**Never paste or commit secret keys, `.env` files, or Firebase service account credentials.** Restrict the test deployment using Vercel Deployment Protection and OpenAI spend limits. A shared preview code is not enough for public production.

## Version 2 acceptance test (recommended)

1. Open the new Career Buddy URL. Enter the owner-preview access code. The app should start in **Quick Answers**.
2. Select an answer to “What best describes your current work situation?” Confirm the next short question appears and the balance remains 60.
3. Fill current job title. Skip the optional industry question, if you wish. Select multiple responsibilities and two or more skills.
4. Provide two **specific one-sentence** examples of professional accomplishments or projects. Generic unsupported self-praise must not unlock the report.
5. Switch to **Ask Career Buddy** in the middle of Quick Answers. Ask a question about your career. Verify a short, helpful AI response, the balance falls by exactly one on a successful career-related exchange, and no five-part follow-up is asked.
6. Switch back to **Quick Answers** and verify it does **not** ask for information already gathered in chat.
7. Attempt report generation before completing the essential fields. The button must be locked. Once all eight readiness categories have adequate information, it should unlock.
8. Generate the report (no credit deduction). Continue chatting using leftover credits. Check that the warnings still appear at 10, 5 and 1 credit.
9. Check `buddyPreviewUsage` and confirm **only AI calls** are logged there: quick-choice selections require no model call.
10. Refresh the browser and confirm your progress, report and credit balance are preserved.

## Files

- `index.html` / `style.css` / `app.js`: responsive Quick Answers / Free Chat interface, with no third-party frontend dependencies.
- `api/service.js`: owner-preview API (`config`, `start`, `state`, `quick`, `chat`, `report`).
- `api/_lib/quickflow.js`: immutable question templates, adaptive question wording, option validation, profile mapping and guided progress.
- `api/_lib/domain.js`: profile merge, input limits, server-enforced report readiness, credit warnings and token-cost calculation.
- `tests/domain.test.js` / `tests/quickflow.test.js`: automated checks.
- `brand-logo.webp` / `favicon.ico`: official assets retained from the Professional Assessment ZIP.

## Run tests

Requires Node.js 20+: `npm test`.

For integration testing on your own computer, use `npx vercel dev` with private local environment variables. You must use the separate Career Buddy Firebase project. The owner-preview access code is *not* production identity management.

## What is NOT built yet

Real payment checkout, production credit ledger, top-up purchases, user authentication, sharing Professional Assessment results into Career Buddy, automated model-cost reconciliation, report regeneration, content uploads, and public launch protections. Pricing remains **indicative** (Starter ₹299/60, Standard ₹179/35, Extended ₹299/75). These components should be built only after validating the real guided and chat experience and costs. **Do not accept customer payments on this version.**
