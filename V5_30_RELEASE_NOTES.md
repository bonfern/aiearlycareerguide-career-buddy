# Career Buddy V5.30 — Coaching Experience & Launch Preparation

**Base version:** V5.29 (Admin Login & Business Analytics)

## Changes

1. **Repeatable resume reviews.** “Review my resume” remains visible in Career Buddy before and after chat turns. After the first completed review, its label changes to “Review another resume”. Each completed review uses the existing five-credit cost. With fewer than five active credits (or expired access), selecting the button opens the existing refill screen instead of leaving a disabled control. Previous saved reviews (up to the server's existing most-recent-eight retention) can be opened from the chat timeline and My Reports. The existing server-side idempotency and cost rules are retained. A repeat attempt after a network error reuses the same request ID for the same resume text.

2. **Visible coaching response progress and arrival.** Sending a chat question displays a waiting message in the chat timeline and an inline status beside the message composer. A successful response is highlighted and a “New response received — View reply” notification is shown. Users who are reading older messages do not have their chat pane forcibly scrolled. Clicking View reply jumps to the answer. Failed requests display a nearby error and restore the original question for retry; retrying the same question reuses the original request ID.

3. **Credit warnings beside the chat composer.** A compact credit count, usage bar and refill action sit beside the input. An amber message appears at 6–10 credits, an urgent message at 1–5, and an exhausted/expired message at zero or expiry. The credit display updates immediately after completed responses and resume reviews. It stays near the composer on desktop and mobile.

4. **Career Buddy introduction.** A collapsible, branded “Start here” guide gives practical examples of roles, career planning, interview preparation, repeat resume review, follow-up questions and existing credit costs. It opens on first use for the current browser/account and can be reopened from its summary. “Got it — start coaching” remembers dismissal in browser storage; it does not create Firestore data.

## No changes

- Pricing, credit deduction amounts, package validity, coupons, payment fulfillment and Firestore data structures.
- Free/Premium assessment questions, scoring, AI prompts or report-generation workflows.
- Feedback Dashboard and Business Analytics Dashboard.

The API state reports version 5.30 for deployment verification. Root HTML asset versions are 5.30 to avoid stale CSS/JavaScript.

## Test results

- `python tests/v5-30-coaching-browser.py`: passes on desktop (1280px), mobile (390px) and compact mobile (320px), with mocked API responses.
- This test covers repeated resume reviews, failed resume/retry, credit thresholds, failed coaching/retry, reply notification, preserved scroll position, guidance display and page width.
- Existing V5.26 Premium navigation, V5.27 progress, V5.28 feedback and V5.29 admin analytics browser tests: pass.
- `npm test`: 163 pass, 25 fail, 11 skipped. The failures are previously present tests for superseded discovery-question formats, not new V5.30 failures.
- **Live Firestore and Vercel production verification not performed.**

## Deployment and acceptance test

1. Upload the complete project files into the existing Career Buddy GitHub repository and deploy to the Vercel *Preview* environment first, then promote the tested deployment to Production.
2. Hard refresh after deployment; confirm `app.js?v=5.30` and `style.css?v=5.30` are served.
3. Sign in using a verified account with Career Buddy credit access. Open Career Buddy, read and dismiss the guide, then reopen it.
4. Submit a question: verify the waiting state, received notification, visible reply and updated credit count.
5. Submit a resume, then submit a revised resume again. Confirm exactly five credits per completed review and saved reviews remain available.
6. With 10, 5, 1 and 0 credits remaining, verify the warning beside the composer. At fewer than five credits, the resume button should open the refills screen.
7. Test chat and resume failures without duplicate charges; test mobile and desktop feedback/analytics functionality before launch.
