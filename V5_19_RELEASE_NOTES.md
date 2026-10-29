# Career Buddy V5.19 — Free Discovery Final Question and Error Recovery

## What changed

1. **Q13 replaced:** “What specific career goal or role would you like to pursue?” (up to 90 characters). Examples: Data Analyst, Lead a team, or Still exploring. The previous optional extra-context question is no longer shown. The question must be answered; “Still exploring” is allowed.
2. **Existing 12 answers carry forward:** An unfinished V5.18 questionnaire goes to the new Q13. Users do not need to repeat earlier answers. Older `additionalContext` answers remain preserved in saved profiles where present.
3. **Better career grounding:** The specific job/goal supplied in Q13 influences the free report. A user who selects Still exploring receives interest-based guidance rather than a fabricated job title. The paid assessment continues to ask users to confirm their specific role before purchase.
4. **Completion hardening:** Added checks for malformed or absent persisted profiles on free-answer submission and free-report generation, plus action-specific server error logging without logging questionnaire content. These guard paths help diagnose the reported null-property error; the screenshot alone does **not** expose the complete property name or stack frame, so the exact production root cause cannot be verified from that screenshot.
5. **Saved report dialog:** The “View snapshot” dialog now matches the current summary, including transferable advantage, alignment, and the deeper-assessment caveat at the end.
6. **One-browser rule** remains disabled by default (`ENFORCE_FREE_BROWSER_LIMIT` unset or `0`).

## Deployment steps

1. Upload the ZIP contents to `aiearlycareerguide-career-buddy` (not the old Professionals or Student repository).
2. Redeploy the Career Buddy **Production** project in Vercel. Do not change your Razorpay or other secrets.
3. Open `https://www.aiearlycareerguide.com/professionals/`, sign in, and complete Q13 using both a specific role and (with a second unused account) `Still exploring`.
4. Generate the free snapshot and view/download the PDF. Test Premium role selection separately without making a real payment unless deliberately authorized.
5. If the error recurs, inspect Vercel logs for `Career Buddy API error` and note the **action** and first stack frame. The updated log identifies which endpoint failed without writing personal answers.

## Test notes

Automated Node tests cover 13-question completion, a real target job, Still exploring, vague goal, nonsensical input, a skipped Q8, backward editing, Other descriptions, migration from V5.18, eligibility and PDF generation. Earlier superseded version tests remain skipped.

**Limit:** Live Vercel/Firebase/OpenAI execution was not possible from the local test environment, so these checks cannot prove the specific October 29 production null error is fully resolved. The enhanced logs are designed to pinpoint it if it persists.
