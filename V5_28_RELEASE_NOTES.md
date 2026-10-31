# Career Buddy V5.28 — Report Depth, Branding and Feedback

Date: 31 October 2026. Baseline: V5.27 (retains V5.26 Premium Assessment Next-button fix).

## Implemented

1. Free Snapshot (web and downloadable PDF): shows both original explanatory bullets for each of four important skills. Newly generated pathways are requested as two-sentence explanations linking personal relevance and practical exploration. Existing saved pathways are not rewritten in Firestore. The final free-report section starts with "Want to know more? Try our Premium Assessment." and explains assessment coverage, report sections, coaching credits and separately charged resume review.
2. Premium sample: `sample-premium-report.pdf` is a static seven-page PDF created using the same Premium renderer with a fictional profile and a prominent illustrative-sample label. It is linked from Free Snapshot, the Premium checkout screen, Know More and FAQ. It uses no user data.
3. Brand consistency: an embedded original logo appears in newly downloaded Free Snapshot PDFs (and preserved Premium and Resume Review PDFs); online report dialogs and Free Snapshot include a branded report header.
4. Supporting pages: Know More, FAQ, Terms, Privacy, Refund and Contact updated for the current seven-question Free Discovery, 12–15-question Premium Assessment, coaching credits, support and optional feedback.
5. Feedback: after Free Snapshot and Premium Toolkit, 1–5 star ratings plus optional category/comments. For each Career Buddy chat response, thumbs up or negative feedback with optional comments. Submission never deducts coaching credits. Firestore records do not duplicate reports, resumes or chat transcripts.
6. Owner dashboard: `/admin/feedback`. Search-filter by stage and visibility/review status; view average rating and low-rating count across loaded records; mark reviewed/reopen; hide/restore; permanently delete with confirmation; export loaded records to CSV. Up to 100 entries per page. The dashboard and API use a verified-email allowlist and server-side authorisation.

## REQUIRED owner dashboard setup before deployment

In Vercel **Career Buddy production** environment, set:

`FEEDBACK_ADMIN_EMAILS=your-verified-owner-email@example.com`

Use the actual verified email you use to sign in to Career Buddy. To allow more than one authorised reviewer, use comma-separated addresses. Do not put an admin password or secret into this variable. Set production + any intended Preview environment separately; redeploy after changing environment variables. If this variable is absent, no account has admin access to feedback. Admin control is *not* the test-only owner-reset PIN.

Open `https://aiearlycareerguide-career-buddy.vercel.app/admin/feedback` after signing in with an allowlisted account. Non-admin accounts should receive an access-denied response. Do not share a screenshot of feedback with unredacted email addresses.

## Data access and moderation

- Firestore collection: `buddyUserFeedbackV1`.
- Owner moderation audit: `buddyFeedbackModerationAuditV1` (no comment text).
- Permanent deletion tombstones: `buddyFeedbackSuppressedV1` (hashed feedback ID, timestamp; prevents deleted abusive comments from being reposted for the same answer).
- Hidden feedback cannot be edited by the original submitter unless an administrator restores it.
- All feedback read and moderation routes check the authenticated, verified account email against `FEEDBACK_ADMIN_EMAILS` on the server.
- Feedback is not published publicly. For deletion of all personal information, handle account/privacy requests separately.

## Validation performed locally

- `node --test tests/v5-28-feedback-and-brand.test.js`: 6 passed.
- `python tests/v5-28-feedback-browser.py`: passed at 1280, 390 and 320 pixels (mock API).
- `python tests/v5-28-dashboard-browser.py`: admin render and hide/restore mock passed at mobile width.
- `python tests/v5-26-premium-navigation-browser.py`: passed on 1280 and 390 pixels.
- `python tests/v5-27-progress-browser.py`: passed at 1280, 390 and 320 pixels.
- Full `npm test`: 160 passed, 25 failed, 11 skipped. Failures are primarily legacy tests for superseded Free Discovery flows and other previously failing test assumptions; treat them as outstanding technical debt.
- Both illustrative Premium PDF and test Free Snapshot PDF were rendered and visually reviewed; the actual sample PDF is included in the ZIP.

## Production testing still required

1. Configure `FEEDBACK_ADMIN_EMAILS` in Vercel and redeploy. Test allowlisted and non-admin accounts.
2. Complete a new Free Snapshot; verify both skills statements, deeper pathways and downloadable PDF.
3. Open the public fictional sample PDF from Free Snapshot, checkout, Know More and FAQ.
4. Submit a Free rating, a Premium rating and helpful/unhelpful chat feedback; confirm new records appear in the dashboard.
5. Mark a record reviewed, hide it, restore it, and delete a test entry; confirm Firestore records and CSV export behave correctly.
6. Confirm Premium navigation and generation/report-download still work with real OpenAI and Firestore.
7. Verify all footer policies on desktop and mobile. Review final legal text and privacy handling with qualified counsel as needed.

## Deliberately not changed

Prices, coupons, coaching credit entitlements, payment APIs, Premium scoring, report AI prompts, saved customer assessments, live Vercel deployment, Firebase production records and historic source cleanup. The package is a source release only; nothing was deployed automatically.
