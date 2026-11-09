# AI Early Career Guide – V5.32.1 Purchase Recovery Layout Hotfix

## Issue

The "Keep access to your purchase" panel appeared above every paid assessment question because the frontend visibility condition checked purchase status but **not** the current screen. Success notices such as "Email unchanged." could also persist while working through questions.

## Changes

- Purchase recovery panel appears **only under My reports** for paid customers whose checkout email is not yet mailbox verified. It is hidden on Premium questions, report generation, Career Buddy coaching and other screens.
- Reset stale account/checkout notices when entering the Premium Assessment screen and after a successfully saved paid answer.
- Keep the existing resend secure link, purchase-email correction, guest-to-paid continuity and paid entitlement logic unchanged. **No API, Firebase, Razorpay or environment variable changes.**
- Bust browser caches with `app.js?v=5.32.1` and `style.css?v=5.32.1`.

## Testing

Run `npm run test:v532` and `python tests/v5-32-checkout-browser.py` (requires Playwright and Chromium); test paid purchase → assessment screen (panel hidden), My reports (panel visible and recovery actions available), then back to Premium (panel hidden). Verify account recovery through emailed links on a preview deployment.

## Deployment

Use the full project ZIP or apply the changed-files ZIP to the V5.32 repository, and deploy to Vercel preview before production. Do not change production secrets or data.
