# Career Buddy V5.22 – Free Career Discovery vs Premium differentiation

## Purpose

Free answers **Where might I go next, and why?** Premium answers **How do my assessed competencies compare with a specific role, and what should I develop?**

## Free report (NEW reports only)

The on-screen snapshot, My Reports dialog, and downloadable PDF now all use the same compact format:

1. **Your career profile:** user's goal or exploring status, self-reported strengths, relevant role skills and any described example. No invented achievements.
2. **Your transferable advantage:** a grounded non-obvious connection between the user's background and career direction.
3. **Three career pathways to explore:** three distinct, ranked suggestions and a concise explanation of each. The user's stated goal comes first when known; alternatives are exploratory, not numerical fit scores.
4. **Three immediate next moves:** short practical activities with tangible outcomes, adapted to barriers and learning time; no detailed 30/60/90-day plan.
5. **What Premium evaluates (bottom only):** scenario-based judgement, competency findings, targeted development priorities and detailed plan.

The PDF is deliberately **two A4 pages** in tested sample and boundary cases, with a maximum target of **three pages**. Free reports do **not** contain scored readiness, rigorous skill-gap matrices, certifications, detailed learning roadmaps, interview question banks or resume analysis. The separate resume-review feature remains available through paid coaching credits only.

## Changes to AI prompts / cost

- `personalisedSnapshotPrompt` now requests exactly **3 ranked, reasoned pathways** plus **3 specific immediate actions**, with a concise transferable insight; it no longer generates the unused separate career-alignment narrative.
- Same `OPENAI_MODEL` as V5.21. No additional AI calls while answering or going Back. The private synthesis still occurs once when a new free report is generated; its output budget is 1650 tokens, so real cost may vary. Token accounting remains unchanged.
- The shared role-only guidance cache remains unchanged and does not store personal answers. Model validation rejects incomplete results; if synthesis is unavailable, a restrained local fallback fills the same structure.

## Compatibility and deployment

- **No changes to the 7-question / conditional eighth-question free form** or email login, user consent, Back and Other controls, browser-restriction testing setting, or daily free-report limits.
- Existing generated snapshots (version 5 or older) remain saved and rendered with their original layout. Newly generated snapshots use version 6 / `focused-free-discovery`.
- No changes to Premium Assessment question generation, graded reports, coaching credits, prices, Razorpay keys/webhooks, 99%/100% coupons, account balances or purchase history.
- No new Vercel environment variables. Main website and old Professional repositories stay untouched.
- Deploy this ZIP's contents to the existing `aiearlycareerguide-career-buddy` GitHub repository. Wait for Vercel Production redeploy, then test with a **fresh eligible verified account**; previous saved free snapshots are not rewritten.

## Validation in this build

- 138 active Node tests passed, 0 failed; 11 superseded historical free-question tests skipped.
- Mocked API completed both 7- and 8-question paths, migrated an old incomplete profile, and produced a version-6 free snapshot with 3 pathways and 3 actions while the external AI was deliberately unavailable.
- Browser UI (snapshot page and My Reports dialog) checked at 1280px, 390px and 320px; no horizontal overflow or JavaScript errors.
- PDF sample rendered and inspected: two A4 pages, all sections present, Premium explanation last; content-range test confirms at most three pages. No real OpenAI call or live Firestore/Razorpay operation was performed.

**Launch check:** Compare the actual generated report for a clear role and a Still Exploring profile. Confirm the recommendations truly reflect their answers, and that purchases and Premium reports still work before announcing the update.
