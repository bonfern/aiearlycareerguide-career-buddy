# Career Buddy V5.4 — Focused Free Career Discovery

**Project:** AI Early Career Guide — Career Buddy  
**Repository:** `aiearlycareerguide-career-buddy` (separate project)  
**Release:** controlled testing only; no real payment processing.

## What changed from V5.3

- **One landing-page choice:** Free Career Discovery. The landing page explicitly explains the two options available *after* the free snapshot: **Premium Career Assessment** and **Career Buddy coaching**. Neither is an upfront entry choice.
- **Seven free questions**, replacing ten. Removed the **industry** and **career move timeframe** questions. Removed the generic 'What do you spend most of your time doing?' question from free screening.
- **Experience range:** the highest choice is now **Over 20 years**, immediately preceded by **13–20 years**.
- **Role-aware competencies:** after the user enters their target role, the next multi-select question offers capabilities that match that role. A subsequent development-priority question uses the same role-relevant list. Supported role families include process excellence, project and product management, technology, analytics, HR, finance, sales, marketing, operations, education, healthcare, creative/design, legal, hospitality and senior general management. Unknown roles receive transferable options and **Other**.
- **Cost protection:** role-aware question options use a deterministic curated catalogue; answering quick questions needs **no OpenAI call**. The existing snapshot guidance remains cached across users **by target role only**; private profile information is not cached across accounts.
- **No unsupported competency scores:** selected strengths mean **self-reported practical experience**, not independently tested competence. Users may select **No hands-on experience yet**, as a sole answer, and still receive a preliminary snapshot.
- **Seamless upgrade:** free answers, saved snapshot and verified email are carried into either subsequent paid route. The paid detailed assessment requires deeper project examples, learning constraints and any missing information; the optional resume step is still first.
- Existing saved reports remain accessible. Removed questions are never re-asked. If a tester had not yet completed the old free flow, the new role-specific competency question may appear; users who already have a saved snapshot are not required to repeat intake.

## Free intake — 7 questions

1. What best describes your current work situation?
2. What is your current or most recent job title? (short text)
3. How much relevant work experience do you have? (up to Over 20 years)
4. What would you like help with most?
5. Which role would you like to work towards? (short text)
6. Which target-role competencies have you used in practice? (role-aware, choose up to four; Other/None supported)
7. Which target-role competency would you most like to develop? (role-aware; includes Not sure yet)

**After the free snapshot:** the user chooses Premium Career Assessment (indicative ₹499) or Career Buddy Coaching (indicative ₹149). Starter/refill prices and amounts are unchanged in this iteration. Real checkout is still disabled.

## Deployment steps

1. Extract `AI_Early_Career_Guide_Career_Buddy_V5_4.zip` and upload **the contents of the enclosing V5.4 folder** to the root of the existing private GitHub repository `aiearlycareerguide-career-buddy`, replacing V5.3 files.
2. Let the independent Career Buddy Vercel project redeploy, then hard-refresh the preview URL. Do not modify Student, existing Professional Assessment or Recruiter projects.
3. Use the **existing** Career Buddy configuration and verified-email setup; no new environment variables or Firebase project are necessary.
4. Test with a new owner-test email or use the existing **Owner test tools → Reset test session** to experience all seven questions. Do not reset a real customer's account.
5. Test at least two target roles, such as Director of Process Excellence and Product Manager, and verify the competency choices differ. Check the free PDF, both paid follow-up choices, return/resume by email and the optional resume step.
6. Run `npm test` with Node 20+. For a mocked UI-only browser run (Chromium/Playwright installed), use `python tests/browser_flow.py`.

**Validation:** 59 Node tests pass; mock desktop/mobile browser journeys pass. This package is not yet tested against your deployed Vercel/Firebase/Resend/OpenAI account. Pricing remains indicative, and test purchases do not collect funds.

---

## Key implementation rules

- Server-side `intro`, `starter` and refill pack entitlement checks require the free snapshot. Chat requests also enforce the assessment gateway, even if someone bypasses client navigation. Legacy test sessions holding credits but missing a snapshot must complete discovery before they can chat.
- Journey choice is saved per **verified email** in Firestore (`journeyPreference: 'free' | 'premium'`). Reloads and re-verification resume the saved journey, subject to what has been completed.
- A user who selects Premium from the first screen **still completes free discovery**; a paid order is not offered prematurely. The free report remains downloadable under **My reports** at every later stage.
- After completing the free snapshot, both paid options appear together. Users can navigate via Home or My reports without losing answers, history, credits or reports.
- During coaching, the saved career profile, free snapshot summary and any generated premium report summary are passed to the AI as labelled user-provided context. The assistant does not repeat the structured intake.
- Nonsensical/off-topic successful responses use **one credit**; obvious junk can receive a low-cost local redirect. Errors, blocked duplicates and invalid messages remain free.
- Free role guidance retains the existing cross-user **role-only** cache. Do not cache identifiable user profiles or resume contents. One free report per verified email in owner testing remains controlled by daily free-report caps.
- Previous snapshots, paid reports, optional resume exports, discount coupon **test** calculations, download history, credit warnings and mobile-first layout remain intact.


## Release blockers (unchanged)

- **Real Razorpay checkout is NOT enabled**. Implement verified payment orders and webhooks, idempotent entitlement and credit grants, refund paths and coupon/invoice/tax handling before enabling paid traffic.
- Keep preview access protected; complete production authentication hardening, abuse/IP throttling, user privacy/deletion, data retention, monitoring, cost budgets and load testing before public access.
- The **separate Professional Assessment import** remains planned, not yet connected. Only Career Buddy's own free/paid context is transferred in this build. A future consent-based signed import can be added without modifying live applications until explicitly approved.
- Prices and credit allocations are provisional until measured AI usage and customer conversion tests validate contribution margins.

