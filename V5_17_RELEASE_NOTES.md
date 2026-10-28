# Career Buddy V5.17 — Nine-question Free Discovery and richer snapshot

## What changed

1. **Two focused questions** after the existing seven: how the person has used the skills they selected (structured), and one optional work/study/project example (short text, maximum 300 characters). Students and those with no hands-on exposure get appropriate wording and response options.
2. **Low-cost answer validation:** Empty text, repeated characters, common keyboard strings and vague personal praise are rejected locally, with an actionable explanation. The example is optional; a person with no example can select **Skip — no example yet**. This is not a semantic proof of truth: the report model is instructed to ignore irrelevant, vague or contradictory examples instead of inventing experience.
3. **Saved answers and Previous:** The nine responses are stored in the same verified email session. Changing earlier answers does not generate new role guidance or deduct coaching credits. Skipping the final response remains reversible.
4. **Restructured free snapshot (web and PDF):** Opening section has only career goal, role skills and self-reported exposure. Then personalised transferable advantage, career alignment and two evidence-grounded next moves. All further-evaluation and non-verification language appears at the end.
5. **Personalisation using the existing free model:** Role-only competency guidance remains shared/cached for 90 days. One short per-user OpenAI call, using **the unchanged `OPENAI_MODEL`**, synthesises individual insights from the private questionnaire. It is not shared, and usage is logged separately as `free-personal-insight`. When the OpenAI call fails, a conservative locally built fallback still generates the free snapshot.

## Cost and access

- **No new environment variables**; no change to the configured `OPENAI_MODEL`, paid assessment model or payment settings.
- No AI calls when answering, skipping or going back. Free report generation now normally uses **one additional short AI call per user** (and the existing role-guidance call only when there is a role-cache miss). This introduces incremental AI cost: review `buddyPreviewUsage` and `usageSummary` after a representative sample; costs vary with model and tokens.
- No changes to ₹499 Premium, ₹149 Intro, refills, credits, or Razorpay payment/webhooks.
- **Existing free reports** from previous versions remain saved and readable and are not automatically regenerated. To test the new nine-question journey, use a new verified account in an unused browser profile, respecting the one-free-assessment-per-browser rule. Do not clear another customer's browser/session to bypass the limit.

## Deployment

1. Commit/unzip V5.17 source into **`aiearlycareerguide-career-buddy`**; do not update the Student or main-site routing repositories.
2. Deploy Vercel **Production**. The site remains at `https://www.aiearlycareerguide.com/professionals/` through the existing rewrite.
3. Test a new verified email, complete all nine questions, use Previous, then generate a free report; inspect both the on-screen and downloadable PDF report.
4. Repeat with a student/no-experience profile and Skip on the example, without treating absent examples as evidence.
5. Confirm model usage entries for `free-personal-insight` and cache behaviour. Monitor free API costs and the existing daily cap.
6. Existing live payment configuration is unchanged. Verify the checkout readiness separately before accepting payments.

## Validation limitations

Local automated tests and static PDF rendering verify the flow and document structure. A live OpenAI response, actual Firebase session storage, verification emails and live Razorpay transactions have **not** been executed by these tests. Those require a production smoke test after deployment.
