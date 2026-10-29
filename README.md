## V5.17 – More insightful Free Career Discovery

- Thirteen free questions about career stage, situation, interest fields, strengths, enjoyed work, environment, education, skills, goals, learning time, change comfort, career priorities and specific career goal / target role.
- Empty, obviously nonsensical and vague self-praise responses are rejected before any AI call; other responses are treated as unverified statements. Previous and Skip remain available.
- The free report now opens with the career goal, role-specific skills and which skills the user selected as having used. Transferable advantage, career alignment and two specific next moves follow. Questions about deeper assessment appear only at the bottom.
- Reuses role-only cached competency guidance and adds **one short user-specific synthesis on the existing `OPENAI_MODEL`** when a new free report is generated; no model calls during the 13 answers or navigation. Token usage is tracked as `free-personal-insight`.
- The cached role guidance **never contains user-specific data**. Existing saved reports and payments remain unchanged.
- Paid assessment questions, model settings, prices, coaching credits and Razorpay integration are unchanged.

> **Latest update: V5.15 — Ayesha · Your Career Buddy.** See [V5_15_RELEASE_NOTES.md](V5_15_RELEASE_NOTES.md) for features, credits, real AI-cost measurement, model settings and deployment.

# Ayesha – Your Career Buddy | V5.15

Career Buddy is the separate application behind **https://www.aiearlycareerguide.com/professionals/**. Deploy this source to the existing **`aiearlycareerguide-career-buddy`** GitHub repository / Vercel project. It must **not** be uploaded to the retired Professionals assessment repository or to `BONCCPMT-V2`.

## What's new in V5.15

- Calm, soft teal **Get my free career snapshot** call to action, normal font weight.
- Accessible processing indicators during sign-in, preparation, scoring, downloads and coaching. Razorpay owns the screen during payment confirmation.
- Removed excessive disclaimers and developer-centric cost commentary from question screens. Important limitations remain in concise report copy and policies.
- **Ayesha – Your Career Buddy** branding, suggested career coaching prompts and a dedicated resume-review action.
- Paid competency question bank uses **`gpt-6-astra`** high/medium reasoning and the older Professional Assessment's quality controls: 4–5 essential role skills, 3 scenario questions per skill, plausible balanced choices and private answer keys. A versioned role-only bank cache reduces repeat costs. Report generation uses **`gpt-6.1-sol`** by default (separate `REPORT_MODEL` override).
- The paid assessment and report no longer ask for or analyse a resume. Resume review is an optional coaching tool (first suggested action, and available thereafter), can accept up to **16,000 characters**, identifies missing evidence and corrections, offers a standalone PDF, and deducts **5 credits only on success**.
- Prices remain ₹499 Premium and ₹149 Intro. New grants: 40 coaching credits for Premium, 12 for Intro; refills ₹249/30 credits and ₹399/60 credits. Previously granted user balances remain untouched.
- Marketing/informational pages reflect current credit numbers and distinct resume-review offering.

## Deployment and configuration

1. Update **`aiearlycareerguide-career-buddy`**, redeploy the **Career Buddy Vercel Production** environment. No new main-site rewrite or webhook URL is needed if the existing site has been routing correctly.
2. Preserve all existing keys and session secrets (Firebase, Resend, OpenAI, Razorpay). The original live checkout and coupon safeguards remain unchanged.
3. Suggested Vercel Production model variables:

```
ASSESSMENT_MODEL=gpt-6-astra
ASSESSMENT_REASONING_EFFORT=high
ASSESSMENT_FOLLOWUP_REASONING_EFFORT=medium
REPORT_MODEL=gpt-6.1-sol
REPORT_REASONING_EFFORT=medium
# OPENAI_MODEL=<existing lower-cost coaching/free model>
# OPENAI_USD_INR=<your chosen accounting exchange rate>
```

4. In a fresh verified test account, complete Free Snapshot → Premium purchase (an owner-approved 100% coupon is fine for access testing) → three-stage competency preparation → 12–15 graded scenarios → saved report. Confirm there is no resume gate or resume content in the report.
5. Open **Ayesha coaching**, verify 40 newly granted credits for Premium or 12 for Intro, open Resume Review, paste a text sample longer than the normal coaching-message limit and confirm one successful review deducts five credits and its PDF downloads. Ordinary completed chat messages debit one credit; failed technical requests should not.
6. Test a real paid Razorpay transaction and webhook/capture/duplicate prevention separately before broadening public marketing. **This ZIP does not change checkout enablement or verify a live charge.**
7. Review Privacy, Terms and Refund drafts for your business and local legal requirements before public release.

## Validation

`npm test` is the unit/regression suite; `python tests/v5-15-browser.py` performs mocked Chromium desktop / mobile responsive checks at 1280, 390 and 320 pixels. Browser tests do **not** connect to Razorpay/Firebase/OpenAI.

See **V5_15_RELEASE_NOTES.md** and **PAYMENT-TEST-PLAN.md**.
