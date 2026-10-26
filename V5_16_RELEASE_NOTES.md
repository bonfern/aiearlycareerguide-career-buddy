# Career Buddy V5.16 – Identity, consent, free discovery, and branding

## Summary

This release updates the existing Career Buddy repository. It does not change any Razorpay, Firebase or OpenAI credentials, payment amounts, packages, assessments already purchased, or routing. Upload these files to `aiearlycareerguide-career-buddy`, not to the old Professionals or main website repositories.

1. Career Buddy is once again the **only** product/coach name throughout the website, paid screens, resume tool, PDF generation and customer-support pages.
2. The free-snapshot call-to-action uses **smaller (13–15px), normal-weight text** and a restrained pale-teal treatment.
3. The verified-email entry form requires an unchecked **Privacy Policy + Terms acknowledgement and processing consent**, and an age declaration (Career Buddy is now explicitly intended for people **18 and older**). The server validates the consent and records its version and accepted timestamp against the verified email after the OTP succeeds.
4. The verification email now uses a branded responsive HTML template with the official logo, a prominent six-digit code, expiry/security instructions, and an accessible text fallback. Logo and application URL use `https://www.aiearlycareerguide.com/professionals/`. Verify the live webhook/rewrite remains active; this change does not modify it.
5. One browser can initiate one free discovery, enforced in Firestore using a **hashed random browser ID** set in browser storage; the original verified email may resume. The UI explains the limit before sending the verification code. The existing one-free-report-per-email and daily report cap still apply. **Limits**: clearing browser storage, incognito mode and another device can bypass browser identity; this is an anti-repeat-use control, not strong device fingerprinting.
6. Exactly seven free questions remain, but are now in this order: work/study status → career goal → target role (or “Still exploring”) → current role / qualification → practical experience (including “No experience yet”) → practised target competencies → area to develop. Student and recent-graduate prompts adapt without requiring a previous job title, and the scripted seven questions consume no OpenAI tokens. Question review remains available before generating a snapshot.
7. A separate consent is required before submitting pasted resume text to the AI review service. The server also validates it; successful reviews record a consent timestamp. Existing five-credit pricing and PDF reports are unchanged.
8. `info.css` was previously empty, so the supporting documents lacked consistent visual styling. These pages now use the official logo, navy header, responsive text layouts, nav links and consistent Career Buddy naming.

## Deployment

- Upload all extracted files to the existing **Career Buddy** GitHub repository.
- Keep Vercel Production environment variables unchanged; **no new variables are required**.
- Redeploy the Career Buddy **Production** project. Preserve `PREVIEW_SESSION_SECRET` exactly so existing verified sessions remain recoverable.
- Users who signed in before the new privacy notice will be asked to **sign out and verify their email again** before submitting new free-assessment answers; existing reports remain available.
- Test the deployed `https://www.aiearlycareerguide.com/professionals/`, confirmation email (including image-off fallback), student path with no experience, Previous review, PDF and 1-browser/2-email rule.
- Continue to verify Razorpay webhooks and live transactions separately. V5.16 does **not** enable paid checkout or bypass payment safeguards.

## Scope / privacy review

This build expressly restricts the Professional Career Buddy experience to adults 18+, directing younger visitors to the separate Student Career Assessment. Before a public release, review the customer-facing Privacy Policy, consent language, retention/deletion handling, and any local age/parental consent rules with a qualified adviser. This update does not itself certify legal compliance.

## Validation

- 129 Node automated tests passed, including five new tests covering branded email, consent, browser identity, branching student intake and support pages.
- Browser-level UI checks passed on desktop (1280px) and mobile (390px and 320px).
- Existing paid-coaching and resume-review browser simulation passed on the same three screen widths.
- Live Resend delivery, Firestore browser-claim transactions and Razorpay are not independently exercised by these local tests and should be verified on the deployed site.
