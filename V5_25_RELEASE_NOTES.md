# Career Buddy V5.25 — Assessment reliability and communication review

## Why this update is necessary

The previous paid question generator creates a competency map and two question batches in three server calls. Each batch is checked for distinct scenarios, role-skill coverage, believable options, the single-best-answer requirement, and other quality rules. In V5.24, **one invalid question could reject a whole batch of six or nine otherwise valid questions**, leading to expensive repeated generation and a confusing customer error.

The screenshots show `competency generation rejected` at preparation stage 2 (stage 1 completed). The **specific rule that rejected the production response is not visible in the cropped log**. We have not claimed a particular AI-generated error was observed; instead, this change fixes the brittle retry design at the source.

## What changed

1. Validate each three-question competency group separately and keep groups that pass. On a retry the model is asked to **repair only invalid competencies**. There is no substitution of fabricated questions or unverified answer keys.
2. Detect identical scenarios across saved earlier batches and newly generated groups. Never trade answer quality for completion.
3. Save even partially accepted question groups securely to the existing session draft when both current attempts fail. A later retry resumes that stage and does not regenerate saved valid groups. Existing paid customers, credits, answers and earlier generated banks remain intact.
4. Retain token-usage records for provider responses that fail validation; avoid claiming AI retries are free.
5. Keep stage labels meaningful: role-competency map, initial questions, final questions. One progress status instead of repeated, incomplete copy and multiple error banners.
6. Make errors professional and actionable without revealing validator implementation details to customers. Store safe diagnostic details (role hash, stage, affected competency, failure reason, retained question count) in Vercel logs.
7. Refresh saved preparation status after an error (no AI call) so customers can see retained questions. Correct a navigation notice that previously disappeared immediately after changing screens.
8. Keep the existing assessment model, 12–15 questions, 4–5 assessed skills, prices, credit accounting, payment, coupons, coaching, report generation and `/professionals` routing unchanged.

## Validation in this environment

- 154 active Node.js regression tests passed; 0 failed; 11 historical superseded tests skipped.
- New tests cover targeted single-skill repair, partial draft preservation across requests, revalidation of saved groups and rejection of obviously weak distractors.
- New mocked Playwright browser checks passed at 1280px, 390px and 320px for saved progress, error message, retry, no repeated alerts and responsive layout.
- Previously established v5-23 checkout switching browser checks also passed.
- No live AI call, live Razorpay transaction or production Firestore transaction was run. End-to-end production confirmation still requires testing.

## How to deploy safely

1. Upload all V5.25 files to the existing `aiearlycareerguide-career-buddy` repository, retaining a copy of the previous V5.24 deployment for rollback.
2. Redeploy the Career Buddy **Production** deployment in Vercel.
3. Use the same verified account and open **Premium Assessment**. Previously saved stage 1 and stage 2 data should remain available, unless a separate session reset was explicitly performed.
4. Select **Continue preparation**. The page will show current progress, and generation will resume from the first missing group. If a specific stage fails repeatedly, copy the **full expanded** Vercel log entry beginning `Career Buddy competency generation rejected` (hide anything private). It now contains affected competency IDs and reasons.
5. Complete the scenario questions and verify report creation, then test closing a Razorpay checkout and switching products. Do not use live money solely to verify question preparation if a paid entitlement already exists.

## Scope and limits

This is a recovery and error-messaging upgrade, **not** a guarantee that an external AI service will never timeout or return unsuitable questions. In those cases validated groups are saved, retries target only the incomplete competencies, and the customer receives an actionable message. No new Vercel variables or Firebase collections are needed.
