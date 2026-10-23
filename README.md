# Career Buddy V5.6 — Focused Competency Assessment

**Private preview build.** This remains a separate GitHub repository, Firebase project and Vercel deployment from the Student, Professional Assessment and Recruiter products. No existing live application is modified. **Razorpay is not activated; all packs are simulated.**

## V5.6 — What changed

### 1. Free Career Discovery (seven questions)

- The target-role competency question now explicitly says **“Select up to 4.”**
- A live `0 of 4 selected` counter and frontend selection guard prevent a fifth choice from being selected; the backend also validates the same maximum. “No hands-on experience yet” is exclusive.
- The free snapshot profile summary now gives a brief interpretation of the target role and existing experience, and explains which assumption still needs assessment. It no longer merely strings together submitted answers.
- Older V5.5 reports remain available. Open **My reports → Refresh guidance** to regenerate the free snapshot with V5.6 wording without repeating questions. Shared generic role guidance is cached; personally identifying profile summaries are never placed into the shared cache.

### 2. Premium assessment (after free snapshot + simulated ₹499 starter)

1. The first paid step remains **paste or skip your resume**.
2. Select **Prepare my competency assessment**. The AI creates a role-specific bank the first time a target role is assessed, with **4–5 essential competencies** (at least two technical and two soft/behavioural).
3. Each competency has **three distinct multiple-choice questions** (12–15 in total): applied knowledge when relevant, plus workplace scenarios of differing difficulty. Answers have **four plausible options plus “Not sure.”** No lengthy typing is required.
4. Each selection is saved against the verified email account, and the next question resumes where the user stopped. Quick selections do **not** deduct coaching credits.
5. The full detailed career report is locked until **all** 12–15 essential questions have been answered. It retains all the existing Professional Assessment-style sections, including skill-level development actions, unassessed skills, 30/60/90-day milestones, interview preparation and optional resume analysis.
6. The report now uses **server-calculated performance** for each competency and identifies topics to practise from incorrect scenario responses. It distinguishes *judgement shown on scenarios* from *verified job performance* and *self-reported career history*.
7. Remaining coaching interactions can still be used after generating the report. Pricing and number of credits are unchanged and indicative.

### 3. Security, privacy, costs and caching

- The server stores question banks, private answer keys, grading explanations and submitted choices. Browser API responses expose only the current question and available choices; answer keys, correctness and grading rationales are not sent to the browser before the report.
- Shared question-bank cache: Firestore collection `buddyCompetencyBanksV1`, keyed by **normalised target role only**. No name, email, resume text, chat history or answers are included. Banks are labelled with a version and 90-day expiry metadata.
- Bank generation follows the approach of the existing Professional Assessment: precise role/skill map, 3 challenging questions per skill, distinct subskills, strict validation, credible distractors, and server-owned scoring. It is not a copy of that app's database or runtime.
- A first-time target role generally requires **three OpenAI calls** (skill map + two parallel question batches); subsequent users of the same target role reuse the bank. API token usage from successful bank creation is logged against preview usage and cost summary. The detailed report call and coaching remain independently logged.
- Configure `OPENAI_INPUT_USD_PER_MILLION`, `OPENAI_OUTPUT_USD_PER_MILLION`, `OPENAI_USD_INR` with rates and exchange assumptions applicable to your chosen model; leaving them zero yields *unpriced* calls, not meaningful cost estimates.
- Failed calls or responses that fail validation may still incur API charges. For accurate profitability before public launch, compare the OpenAI dashboard invoices with the application's successful-call logs.

## Local tests (no account needed)

With Node.js 20+:

```bash
npm test
```

This suite includes 72 automated tests, covering the original user journeys plus new assessment-bank validation, free snapshot language, four-option selection cap, question-bank reuse model, server-only keys, scoring, report readiness, and a graded report PDF.

If Python Playwright and a Chromium binary are installed:

```bash
python tests/v5-6-browser.py
```

This isolated browser test mocks paid question banks and API responses; it verifies 12 scenario selections, progress, report gating, the selection cap and mobile/desktop overflow. **It does not prove that the live OpenAI service will always generate a valid assessment.**

## Controlled private deployment and acceptance test

1. **Do not merge into any other application.** Replace the V5.5 files in the separate `aiearlycareerguide-career-buddy` repository or push this to a preview branch.
2. Deploy to the **protected Career Buddy Vercel Preview deployment**, using the dedicated Career Buddy Firebase, Resend and OpenAI services. `vercel.json` permits up to 240 seconds for the bank-generation endpoint; check your Vercel plan supports that function limit.
3. Keep preview authentication enabled and payments simulated. Do not add the public custom domain or publish the site.
4. To retest from scratch, use **Owner test tools → Reset test session**, not a new email to repeatedly claim free assessments.
5. Test target roles from different families (e.g. Director of Process Excellence, Product Manager, HR Business Partner) and a four- vs five-competency bank.
6. Check that 12–15 *different* scenario questions appear, the distractors are plausible, “Not sure” is available, and the report remains locked until all are answered.
7. Check the detailed PDF reflects the exact assessed competencies, including technical and behavioural skill development, and does not claim demonstrated workplace competence based solely on MCQs.
8. Check optional resume skip and paste, downloading both report and resume, preserved credits after the report, re-login by the same verified email, and the user's free snapshot under My reports.
9. Inspect `buddyPreviewUsage`, session `usageSummary`, and the provider's actual invoice before revising indicative prices.

## Existing preview credentials

Keep the current `PREVIEW_ACCESS_CODE`, `PREVIEW_SESSION_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `OPENAI_API_KEY`, `OPENAI_MODEL` and owner reset settings in the **separate** Vercel project. Never commit secrets. See `.env.example` for placeholder names. No new Firebase collection needs to be provisioned manually; the server will create the assessment bank collection when first used.

**Release limitations:** V5.6 has passed automated and isolated UI tests, but authenticated, real OpenAI + Firebase end-to-end assessment generation and production payment verification have not been tested here. Keep the app in protected private preview until those checks pass. Generated questions, grading rationales, report content and actual AI spending need human quality review prior to launch.
