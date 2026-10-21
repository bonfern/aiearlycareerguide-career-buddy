# Career Buddy — Version 1 owner preview

**Separate new project.** This repository is *not* the Student Assessment, Professional Assessment, or Recruiter Assessment app. It shares only the official logo/favicon and concepts from the supplied Professionals ZIP. Do not overwrite or change any live app while setting this up.

## Important status

**This is a functional, protected owner-testing prototype — NOT a production paid product.** The UI displays a proposed Starter ₹299 / 60 interactions / 30 days, Standard refill ₹179 / 35 / 30 days, Extended refill ₹299 / 75 / 60 days. They are *indicative* only. There is **no Razorpay checkout, no paid top-up, no existing-assessment import, no customer self-service account, and no real credit purchase** in Version 1. Each owner preview session gets 60 **test credits**, and opening a fresh preview session grants another 60 test credits. Test data is stored in the **new dedicated Firebase project**, not in your Professional Assessment database.

The purpose of Version 1 is to evaluate the conversation, report readiness, report structure, user interface and actual usage/cost before enabling payments. **Do not publicly launch, share the preview access code with paying customers, or accept payments against this prototype.**

## What's included

- Responsive branded desktop/mobile career conversation interface (official `brand-logo.webp` and favicon from the supplied Professionals ZIP).
- Model-assisted natural conversations that progressively build a structured profile (with bounded context and career-topic checks).
- Server-side and browser-side maximum of 1,200 characters per user message; soft warning at 1,000; AI reply length prompt and token cap.
- Professional-domain classifier, duplicate detection, short per-session cooldown, off-topic limit and scoped prompt. These are preview guardrails, not a complete production abuse defense.
- Report-readiness checks: current situation; objective and target; timeframe; responsibilities; two sufficiently detailed examples; skills; development gap; constraints. Users can see missing topics; the report button stays disabled until the server confirms readiness.
- One user-triggered report (zero chat credits), then continued coaching until remaining credits expire or are exhausted.
- Always-visible credit balance, warnings at 10/5/1, expiry warnings, preserved history/report in read-only mode.
- Firestore `buddyPreviewSessions` stores sessions, messages, profiles and reports, and `buddyPreviewUsage` records tokens and **measured API usage**. INR cost is shown only when verified model token rates and USD/INR are configured.
- Pure JS test suite (`npm test`). No production purchase and no production billing controls yet.

## Step-by-step deployment (new repo only)

### 1. Put the code in your new GitHub repository

Use `aiearlycareerguide-career-buddy` created earlier. Extract this ZIP on your computer, then upload its **contents** (not the ZIP file itself) into the repository root. Preserve paths such as `api/service.js`, `api/_lib/domain.js`, and `tests/domain.test.js`. Don't rename the repository or move any files into your existing projects.

The most reliable approach if you have Git installed on Windows is:

```powershell
git clone https://github.com/YOUR-GITHUB-USERNAME/aiearlycareerguide-career-buddy.git
# Copy the contents of this extracted package inside the cloned folder.
cd aiearlycareerguide-career-buddy
git add .
git commit -m "Career Buddy v1 isolated preview"
git push origin main
```

Alternatively use GitHub **Add file → Upload files** in batches, navigating to the appropriate folders when necessary. Never upload `.env`, `.env.local` or a Firebase service account JSON. `.env.example` contains placeholders only.

### 2. Create a brand new Firebase project

Open https://console.firebase.google.com → **Add project** → choose `aiearlycareerguide-buddy` or an available variation. Enable **Cloud Firestore** (production mode, not open/test rules). Choose a supported region in line with your data and privacy requirements. Since this prototype uses *Firebase Admin on the server*, browser users do not require Firestore client access; keep Firestore rules restrictive. Under Project settings → Service accounts, generate the service account credentials for this **new project only**. Store the JSON privately. Do not paste it in ChatGPT or commit it.

### 3. Create a separate Vercel project

In https://vercel.com/new, select **Import Git Repository**, choose `aiearlycareerguide-career-buddy`. Framework preset: **Other**; Root directory: `./` (repository root). Deploy into a **new project**, not the live Professionals project. Vercel serves root `index.html` as static files and `/api/service` as a Node.js Function.

Use **Vercel Deployment Protection** / access protection if available on your plan. A shared preview access code by itself is not sufficient protection against determined automated abuse.

### 4. Add environment variables to *this new* Vercel project

Vercel → Career Buddy project → Settings → Environment Variables:

| Variable | What to enter |
|---|---|
| `PREVIEW_ACCESS_CODE` | A long unique owner-testing passphrase (no old app code). |
| `PREVIEW_SESSION_SECRET` | A new random secret, at least 32 characters, for session cookie signatures. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Complete JSON from the **new Career Buddy Firebase project** (Vercel setting only). |
| `OPENAI_API_KEY` | Server-side API key dedicated/budgeted for Career Buddy testing. |
| `OPENAI_MODEL` | Initially `gpt-4.1-mini` (change after cost/quality testing if desired). |
| `OPENAI_INPUT_USD_PER_MILLION` | Verified USD input token price for the selected model. Do not guess; leave `0` until verified. |
| `OPENAI_OUTPUT_USD_PER_MILLION` | Verified USD output token price; leave `0` until verified. |
| `OPENAI_USD_INR` | Your current documented exchange-rate planning assumption; leave `0` until verified. |

For multiline JSON, paste as one valid JSON string in Vercel's environment settings; quote private keys correctly. Redeploy after adding variables. **API keys and service account JSON must never be sent in the chat or uploaded to GitHub.**

### 5. Owner test flow

1. Open the new Vercel deployment URL (not the old `/professionals` URL).
2. Enter your `PREVIEW_ACCESS_CODE` to create a private test session.
3. Discuss a genuine career scenario. See the 1,200-character counter, profile topic gaps and test credits.
4. Try an unrelated question; it should be redirected without deducting a chat credit (but the model call still incurs a small API cost).
5. Provide two specific professional achievements, role, experience, goal, target, timeframe, skills, gap and constraints. The report button should unlock once the profile checks pass.
6. Click **Generate my report**; confirm credits do not decrease. Open or print the report; continue chatting with remaining credits.
7. In the new Firebase console, inspect `buddyPreviewUsage` for measured token usage. Verify the test balance and conversation are preserved after page reload.

Testing common hard cases: very long messages, repeated sends, concurrent requests, arbitrary attempts to unlock report, empty messages, report generation after chat credits reach zero (but before expiry), expired owner-preview session, model outage/retry, off-topic spam, and attempts to alter cost or credit counts from browser code.

## Technical boundaries & follow-on phases

- **Current identity:** owner-preview code + signed HttpOnly cookie, *not* production user auth. Each browser generates its own isolated session; future customer identity will use verified emails and secure handoffs. A leaked owner code can create costly test sessions, so enable deployment protection and OpenAI project spend limits.
- **Current credits:** persisted simulated preview counters with per-session transactional locking and idempotent request IDs. No real-money ledger, webhook or refill. Production must move to immutable credit ledger events, verified payment capture and atomic grants. Do not expose a public purchase flow until it is tested.
- **Cost logging:** API usage totals cover successful calls, including a separate report call. Actual charge may include caching discounts, retry/aborted calls, gateway costs or provider pricing variations; do not infer fully loaded margin from these fields alone. If OpenAI returns an error before usage data is available, accurate cost may need provider-dashboard reconciliation.
- **Readiness:** the backend enforces eight category checks and examples of sufficient text length; AI extracts user evidence. This is a conservative **prototype heuristic**, not independent validation of truth or skill proficiency. Refine using real scenarios and human review before going live.
- **Import:** secure import of the existing Professional Assessment is a later build. We must require authenticated user consent, validate ownership on the original system, and transfer only necessary profile/report fields. Email equality alone is not sufficient. No live Professionals repository changes in Version 1.
- **Privacy:** implement customer accounts, consent, deletion/retention, legally suitable privacy disclosures, support and auditability before production.
- **Production abuse control:** server-side per-account/IP limits, independent career-domain classifier/moderation, daily cost ceilings, reserved credit semantics, payment idempotency, security review and monitoring are required before public launch.

## Project files

`index.html`, `style.css`, `app.js` — static responsive UI.

`api/service.js` — owner-preview API: config/start/state/chat/report.

`api/_lib/domain.js` — validation, report-readiness gates, credit warnings, indicative packs, cost calculations.

`tests/domain.test.js` — unit tests.

`brand-logo.webp`, `favicon.ico` — authentic branding assets reused from the supplied Professional Assessment ZIP.

Run tests locally with `npm test`; start the full app for local integration using the Vercel CLI (`npx vercel dev`) with your own private local env values. The preview UI itself will not activate until all required server environment variables are present.
