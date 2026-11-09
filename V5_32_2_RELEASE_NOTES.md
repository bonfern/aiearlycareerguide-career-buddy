# AI Early Career Guide – Career Buddy V5.32.2

## First-visit session banner hotfix

### Issue

A first-time visitor opening `/professionals/` with no saved identity cookie triggered the `state` endpoint. The endpoint called `getSession()`, which correctly rejected requests without an identity cookie with HTTP 401 and the message “Please start your free assessment or verify your email.” The landing-page initializer treated that expected anonymous state as a fatal error and displayed it in the red notice banner.

### Fix

- `ownerState()` now checks for a valid signed guest or paid identity cookie before calling `getSession()`.
- If neither identity cookie exists, the endpoint returns HTTP 200 with `{ state: null, authenticated: false }`. This is the normal first-visit state, not an error.
- If stale or invalid identity cookies are present, the endpoint clears both identity cookies before returning the anonymous state.
- Existing valid guest and paid sessions continue through the existing `getSession()` path and retain the existing restoration, expiry and access checks.
- The frontend no longer repeats the same failed `state` request after an API error. Genuine configuration, network, expired-session and server errors remain visible.
- Static asset cache-busting was updated to `5.32.2` so browsers load the corrected frontend.

### Files changed

- `api/service.js`
- `app.js`
- `index.html`
- `package.json`
- `README.md`
- `tests/v5-31-guest-browser.py`
- `tests/v5-32-checkout-browser.py`
- `tests/v5-32-2-anonymous-state.test.js`

### Validation performed

- `node --check api/service.js` — passed.
- `node --check app.js` — passed.
- Targeted Node tests — 19 passed.
- Offline Playwright browser checks — first-time visitor landing page and Free-to-Premium journey passed at 1280px, 390px and 320px widths.
- Offline browser checks use mocked API responses; they do not constitute live Firebase or Vercel integration testing.

### Deployment

Deploy this hotfix on top of V5.32.1. No Firestore migration, environment variable change, payment change, email change or user-data migration is required. The hotfix only changes the unauthenticated `state` response and frontend cache version.

Use a Vercel Preview deployment first. Verify:

1. A new incognito visitor sees no red authentication banner.
2. The Free Snapshot CTA starts the guest assessment.
3. A returning guest session restores normally.
4. A paid customer session restores normally.
5. Invalid/stale identity cookies are cleared and the landing page returns to its anonymous state.
6. Genuine backend/configuration errors still display an error message.

Promote to production only after these checks pass.
