# V5.15 – Ayesha release details, quality and economics

## Scope
- **User experience:** non-bold calming teal free snapshot CTA, clearer wait/processing UI, simplified screen messages, mobile UX.
- **Paid competency assessment:** 4–5 role-specific critical competencies (technical and behavioural), 3 challenging questions per competency. Question bank generation uses high-reasoning `gpt-6-astra` first stage, medium reasoning subsequent stages. The question bank is cached **per target role only** using a version 2 cache. Users' resumes, employment information, email addresses and question answers are not included in the shared role bank.
- **Report:** evidence-based gap summary, technical/behavioural capability commentary, untested skills, learning and 30/60/90-day actions, interview preparation. Paid report defaults to `gpt-6.1-sol` to control operating costs. No resume assessment or resume rewrite in this paid report.
- **Ayesha coaching:** first suggested prompt is resume review, requiring a separate paste of up to 16,000 characters. Action available later from the coaching toolbar too. Paid successful review uses five credits, can be downloaded as a branded PDF and does not overwrite or rewrite the original resume. Ordinary completed chats still use one credit each. No credit deduction for answering multiple-choice questions; grading is server-owned and deterministic.

## New pack amounts, unchanged prices

| Pack | Price before coupons | New credit grant | Validity |
|---|---:|---:|---|
| Premium Assessment + Ayesha | ₹499 | 40 | 30 days |
| Intro Ayesha | ₹149 | 12 | 14 days |
| Standard refill | ₹249 | 30 | 30 days |
| Extended refill | ₹399 | 60 | 60 days |

New grants only affect newly processed purchases. Existing saved balances / entitlements are **not** reduced.

## Cost estimates vs actual cost

Real cost for your deployed application **cannot** be calculated here without your private, production token-usage records and configured accounting FX. A single paid assessment consists of a shared (per-role) competency question bank, which might take up to three AI calls, plus a per-user report call and any separately generated interview-bank content. Free snapshots and ongoing conversations incur their own model usage. MCQ selections themselves make **no AI call**.

The application records usage in Firestore `buddyPreviewUsage` and maintains session-level `usageSummary` (input/output tokens, estimated INR when `OPENAI_USD_INR` is set). Pricing uses model rates for the default models; other chosen models require Vercel unit-cost settings. Provider bills may also reflect cached-token discounts, retries, tool calls and region-specific rates; estimates are not invoices.

**Illustration, not a measurement:** at the OpenAI Standard short-context list rate of $10/million input and $50/million output for Astra, a 6,000-input / 14,500-output bank generation across multiple stages costs **US$0.785**; at an illustrative ₹90/USD, ~₹70.65 for that *uncached role bank*. A separate 4,000-input / 8,000-output Sol detailed report at $2/$10 per million costs **US$0.088**, or ~₹7.92 at the same *illustrative* exchange rate. One extra role-level interview bank, prompt caching, retries and failed calls can alter this significantly. Actual unit economics require logging a full live trial for unique and repeated target roles.

Do not treat arbitrary credit quantities as an accurate break-even calculation; review the real usage ledger after multiple live trials and adjust packages accordingly.

## Test and launch caveats

- Node regression tests and Chromium mocked flows pass locally. No live Razorpay capture, production webhook, deployed Astra question quality or production OpenAI billing has been tested by this build environment.
- Existing `PAYMENT_FLOW_MODE`, `LIVE_PAID_CHECKOUT_ENABLED`, `RAZORPAY_LIVE_WEBHOOK_SECRET`, 99% and approved 100% coupon variables remain as before. Do not alter them for this update unless making an expressly authorised payment test.
- Update **only** Career Buddy GitHub/Vercel project. Main-site `/professionals/` rewrite and other products remain unchanged.
- Approve legal pages before public use; note AI reviews and assessments are guidance, not independently verified employment evidence.
