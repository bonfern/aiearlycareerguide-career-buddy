# Career Buddy V5.24 – report recovery, coupon validation and navigation

## What changed

1. Premium assessment question preparation retains its three stages and quality checks. The UI now warns that preparation usually takes 2–3 minutes, can occasionally take longer, and saves completed stages. Users can navigate to Career Buddy and Premium screens during preparation. Returning later resumes from the saved stage.
2. Detailed report generation no longer runs two potentially long AI calls within one HTTP request. A reusable generic interview question bank is generated or loaded first; the detailed report is launched once via the OpenAI Responses **background mode** with `store:false`. Its response ID is saved on the server, and the client polls through short requests while displaying progress. It can be resumed after a refresh, without changing payment credits or discarding assessment answers. The existing `REPORT_MODEL` and `REPORT_REASONING_EFFORT` remain in effect. The default model is unchanged. If interview-bank generation fails, the system uses ten conservative generic role-focused topics and the detailed model tailors their answer frameworks.
3. Live coupon input offers a **Check coupon** action that validates the document code, signed-in email, pack and redemption limits without charging money or reserving a coupon. Firestore coupons are still redeemed with server-side transactions and cannot grant access from the browser.
4. The desktop landing hero now uses `object-fit:contain` to show the full portrait; mobile keeps the existing compact crop.
5. The signed-in header includes **Premium Assessment**, **Career Buddy**, **My reports**, **Home**, and **Sign out**. The permanent **Main website** link continues to lead to the main AI Early Career Guide website, including its Student version.

## Important limits and privacy

- The screenshot's Node.js `[DEP0169] url.parse()` warning is separate from the `AbortError` on the report request. The report change addresses the latter, but its effectiveness on Vercel and the specific OpenAI account must be verified with a real paid assessment.
- OpenAI Responses background mode temporarily retains response data for polling (approximately 10 minutes), even with `store:false`; the app deliberately does **not** set `store:true`. The app accepts this temporary processing under its existing career-data consent process. Review the Privacy Policy and your data-retention commitments before public launch.
- If a report job expires after the provider’s temporary response-retrieval window, the app releases the stored job and asks the user to retry generation, without any additional purchase. The earlier AI call may still have cost tokens. Check Firestore `buddyLiveEmailSessions` and Vercel logs for persistent failures; do not manually erase active jobs.
- No API credentials or Firestore personal data are included in this release.

## How to configure Firestore `BUDDY100`

1. In the **same Firebase project connected to Career Buddy's `FIREBASE_SERVICE_ACCOUNT_JSON`**, open Firestore Database, collection `buddyLiveCoupons`.
2. Make a document with the **exact ID** `BUDDY100` (uppercase). Fields with types:

| Field | Firestore type | Example |
|---|---|---|
| `active` | boolean | `true` |
| `discountPercent` | number | `100` |
| `allowedEmails` | array of strings | `["your-verified-email@example.com"]` |
| `allowedPacks` | array of strings | `["starter", "intro"]` |
| `maxRedemptions` | number | `4` |
| `maxPerEmail` | number | `2` |

`allowedEmails` must include the email **verified on Career Buddy**. `allowedPacks` uses the internal pack IDs, not prices or display names. For 100% coupons, allowedEmails may not be empty. Optional date fields `startsAt` and `expiresAt` may be omitted; if present they must be valid Firestore timestamps or numeric epoch milliseconds.

3. Redeploy V5.24. Sign in, open the appropriate purchase screen, enter `BUDDY100`, and click **Check coupon**. This shows a readable reason for invalid coupons **without attempting purchase**. For a valid 100% coupon, **Proceed** creates no Razorpay order and grants the eligible pack once.
4. If the code is valid but access is not granted, check whether you already purchased or redeemed that same pack, or have already used the coupon allowance. An intro pack is only for new coaching users, and Premium requires a specific target role before purchase.
5. Avoid sharing any code granting 100% free access, and disable the document (`active=false`) after tests.

## Deploy and verify

1. Replace the contents of `aiearlycareerguide-career-buddy` with V5.24; deploy to the Career Buddy Vercel Production project. Main-site routing is unchanged.
2. Test `https://www.aiearlycareerguide.com/professionals/` on desktop and phone, including navigation, portrait and 100% coupon validation.
3. With an already-paid test account, complete 12–15 scenario questions and click Generate detailed report. The page should show interview preparation and then report progress; the final PDF and My Reports entry should appear without deducting additional credits.
4. While the report is running, switch to Career Buddy and back. If the page is refreshed, the Premium button should say Resume report generation.
5. Confirm live Vercel logs do not show a new abort in the `report` action; verify OpenAI and Firestore usage/cost records. A successful local mock or unit test does not establish production success.

**No new environment variables required.** Keep existing live keys, webhook secret, payment mode, session secret, model and Firebase credentials unchanged.
