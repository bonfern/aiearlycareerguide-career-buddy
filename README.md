# Career Buddy V5.5 — final polish before private live-AI testing

**Project:** `aiearlycareerguide-career-buddy` (independent of the existing Student, Professional Assessment and Recruiter applications)

**Release status:** source package for **controlled live-integrations testing**. **Not deployed by ChatGPT**. No Razorpay payment collection: purchase and top-up buttons are still simulated. Prices and credit allocations are indicative.

## What changed from V5.4

1. **Scroll and keyboard focus:** each new screen, question or verification step returns to the **top** after rendering, and the visible heading receives focus without changing the scroll position. This handles browser scroll restoration, buttons retaining focus, removed text inputs and narrow mobile screens. Chat-message history still scrolls *inside* its own message panel when appropriate.
2. **Practical free snapshots:** target-role competencies and five next steps now use short everyday language, concrete role-relevant activities, and two helpful bullets under each heading. The four-section format is retained, including what requires deeper assessment. **Shared cache is keyed by target role only**. Personal profile summaries are computed separately and are never shared between users. The role-guidance cache is bumped to **V3** so older, vague V2 entries are not reused.
3. **Contextual coaching entry:** when Career Buddy is first opened, suggested questions are derived *locally* from that verified user's saved **target role, current role, selected development area, practised competencies**, and whether a detailed report has been generated. The first suggested question reflects the most relevant development need; suggestions cost no AI tokens. Selecting a suggestion puts it into the chat input, but **does not send or charge** until the user submits.
4. **Previously generated snapshots** remain saved and downloadable. To refresh an older V2 snapshot with the clearer V3 language, use **My reports → Refresh guidance** or the refresh button on the Snapshot screen. No previous questions have to be answered again.

## Retained behaviour

- Landing page has **one** action: Free Career Discovery, **7 questions**.
- After the free snapshot, the user can choose Premium Career Assessment (indicative ₹499) or Career Buddy coaching (indicative ₹149). The snapshot is required before coaching and is carried into the AI context.
- Premium starts with an **optional pasted resume**, then additional questions, then detailed report/interview guidance and optional Word/PDF resume revision.
- Verified email sessions retain the same answers, reports, coaching messages and credits. The starter and refill packs remain simulated; credited AI replies are logged.
- Only the **role-only guidance** is cached across accounts; private career profiles, interview responses and resumes never enter the shared cache.

## Running tests locally

With Node.js 20+: `npm test`.

For mock browser tests (requires Python Playwright and Chromium): `python tests/browser_flow.py`.

The automated browser tests explicitly check the page returning to the top after navigation, contextual first coaching suggestion, assessment gate, snapshot, upgrade, progress carryover and no horizontal overflow at desktop/mobile widths.

## Deploy for controlled LIVE integrations testing, **not public launch**

1. Upload the **contents** of the V5.5 project folder to the existing private GitHub repository `aiearlycareerguide-career-buddy`. Ideally create a branch named `live-test-v55` to produce a Vercel **Preview Deployment**; do not publish the main Career Buddy production URL or add a public custom domain yet.
2. In the **separate Career Buddy Vercel project**, open **Settings → Deployment Protection** and enable **Vercel Authentication** for preview URLs. For testing with external invited users, grant authorised access/share protected preview links as allowed by your plan. Test in an incognito window that a person without access cannot open the URL. If your desired access method is unavailable, restrict testing to the account's authorised members instead of opening the deployment to everyone.
3. Under **Settings → Environment Variables**, ensure the **Preview** environment has the existing values: `PREVIEW_ACCESS_CODE`, `PREVIEW_SESSION_SECRET`, `OWNER_RESET_CODE`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. The Firebase account must belong to the **separate Career Buddy Firebase project**. Do not copy live Professional, Student or Recruiter secrets into the new application. Don't paste keys or passwords into chat or commit `.env` files.
4. Set `FREE_REPORT_DAILY_LIMIT=5` initially in Preview. Set real nonzero `OPENAI_INPUT_USD_PER_MILLION`, `OPENAI_OUTPUT_USD_PER_MILLION` and `OPENAI_USD_INR` values for **cost measurement**, matching the deployed model and current USD/INR rate; otherwise estimated-cost analytics can be zero/misleading. Review monthly usage and provider spending caps separately. OpenAI API calls are real in this protected preview.
5. Deploy, verify email via Resend, and do a new-account free discovery. Generate the free snapshot, download the PDF, then select Career Buddy coaching and verify the **first suggestion** mentions the saved role/development focus. Ask a genuine question and confirm the AI reply incorporates that context without restarting intake. Run both desktop and mobile tests.
6. With an existing account holding a V2 snapshot, use **My reports → Refresh guidance**, then download and inspect the revised PDF. Test remaining credits and access via the same verified email. Log any failure messages and the test URL (not secret values).
7. **Stop before public launch.** Real payments, public registration/abuse controls, production spending safeguards and customer acceptance testing are separate launch gates.

### Validation limitations

Tests here use mocked session and API responses, plus rendered PDF samples. They **do not** prove the separate Vercel Preview, Firebase, Resend or OpenAI keys are correctly configured. ChatGPT has **not** accessed or changed the user's Vercel, GitHub or Firebase accounts.
