# Career Buddy V5.18 — 13-Question Free Discovery

## Deployment
1. Extract the ZIP and replace the files in the existing `aiearlycareerguide-career-buddy` repository. Do not upload it into the Student or main website repository.
2. Wait for Vercel Production to deploy, then refresh https://www.aiearlycareerguide.com/professionals/ (hard refresh once if needed).
3. Existing Firebase, OpenAI, Resend, Razorpay, coupons, payment keys and webhook settings remain unchanged.
4. Leave `ENFORCE_FREE_BROWSER_LIMIT` unset or set it to `0`. The code **defaults to disabled** for testing. Account-level saved reports and `FREE_REPORT_DAILY_LIMIT` are still enforced.
5. Test with a new verified email or an existing account that has not created a free report. Completed older reports remain accessible.

## Free discovery questions
1. Career stage — one answer, Other with a description.
2. Career situation — select all that apply, Other with a description.
3. Fields/subjects of interest — up to 5, Other with a description.
4. Self-described strengths — up to 5, Other with a description.
5. Enjoyed work — up to 3, Other with a description.
6. Preferred work environment — up to 3, Other with a description.
7. Education/qualification — one answer, Other with a description.
8. Skills, tools, certifications or technologies — free text, optionally skip if none.
9. Biggest career goal in 2–3 years — one answer, Other with a description.
10. Weekly learning time — one answer, Other with a description.
11. Comfort stepping outside comfort zone — one answer, Other with a description.
12. Career priorities — up to 3, Other with a description.
13. Anything else to share — free text, optionally select N/A.

Responses are validated without OpenAI calls. They can be reviewed and changed before generating the free snapshot. Obvious nonsense is rejected for free text. Old partial free intakes start the new 13-question sequence; already-generated reports are not erased.

## How the report adapts
The free discovery no longer asks for a specific job title. The snapshot identifies goals, interest areas, self-described strengths, reported tools and potential transferable connections rather than inventing a target position. The existing model creates the personalised synthesis only when the report is generated; generic career-area guidance is cached. Free snapshots still contain no verified competency scores.

Before purchasing the ₹499 Premium Assessment, the user explicitly names the **specific job role to assess**. This does not add a 14th free question. The server validates and retains the chosen role for the premium scenario questions. Intro Coaching remains available without a specific job role.

## Verification and caveats
The automated test suite covers 13-question progression, single/multi choices and maximums, Other text, optional skip, N/A on the last screen, Back/Edit, readiness and paid-role eligibility. Legacy tests whose nine-question assumptions were superseded are marked skipped, not counted as passes. Chromium smoke checks cover desktop, 390px and 320px mobile layouts. No production AI calls, live Firebase writes or Razorpay charges were made by these local tests.

Browser enforcement is off **for testing only**; if reinstated later, update the policy wording and verify shared-device behaviour. Email and daily free-report safeguards still apply. The code does not change credentials, amounts, package credits or the payment webhook.
