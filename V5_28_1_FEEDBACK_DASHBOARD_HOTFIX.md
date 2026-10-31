# V5.28.1 — Feedback dashboard routing hotfix

Baseline: V5.28; all features, payment logic, report generation, credits and scoring unchanged.

## Root cause
`/admin/feedback` is internally rewritten to `/feedback-admin.html`. In V5.28 this page used relative CSS, JavaScript, logo and API URLs and relied on `<base href="/">`. The Vercel CSP uses `base-uri 'none'`, so the browser refused the base element. From the rewritten route, the relative paths incorrectly resolved under `/admin/`, causing unstyled HTML and a dashboard permanently showing 'Checking access…'.

## Fix
- Removed `<base>`; retained strict Content Security Policy.
- Changed the dashboard stylesheet, JavaScript, logo, favicon, footer/navigation URLs to root-absolute paths.
- Changed both dashboard API calls to `/api/service` so feedback loading and moderation always target the correct endpoint.
- Added a JavaScript-disabled fallback.

## Deployment
Extract and commit the contents of this ZIP in the same Career Buddy repository (project root must contain vercel.json). Redeploy production. Verify `FEEDBACK_ADMIN_EMAILS` contains your Career Buddy verified email for Production, then sign in and visit `/admin/feedback`. An unallowlisted account should display 'Administrator access required', not private feedback.

No Firestore migration, environment secret changes, or data deletion is required. Tests are local; production authorization and Firestore access require validation after deployment.
