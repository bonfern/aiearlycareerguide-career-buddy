# Career Buddy V5.23 — Manage coupons in Firestore

**Location:** Firebase Console → the Firebase project used by Career Buddy → Firestore Database → collection **`buddyLiveCoupons`**. Use an uppercase coupon code as the **document ID** (3–24 characters, letters, digits, `_` or `-`). For example `CBTEST99` or `CB1004RNZF4TZ3G5OKQJC`.

The application checks Firestore for each coupon on every checkout request. **You can add, disable or change coupons without a GitHub commit or Vercel redeployment.** Existing legacy coupon environment variables are supported as a fallback if a Firestore document does not exist. If a document exists, it takes precedence, including when inactive. Never modify existing paid order records to change their discount.

### Example 99% live payment testing coupon

Create document ID **`CBTEST99`** in `buddyLiveCoupons` with these Firestore field types:

| Field | Firestore type | Value |
|---|---|---|
| `active` | boolean | `true` |
| `discountPercent` | number | `99` |
| `allowedEmails` | array of strings | `["your-verified-email@example.com"]` |
| `allowedPacks` | array of strings | `["starter", "intro"]` |
| `maxRedemptions` | number | `4` |
| `maxPerEmail` | number | `2` |

The ₹499 Premium Assessment costs approximately **₹5** and the ₹149 introductory Coaching costs approximately **₹1** after whole-rupee rounding. These are real charges through Razorpay when live checkout is enabled. Use different eligible emails to test the intro and assessment if the same verified account is already entitled to the other package.

### Example 100% complimentary access coupon

Create document ID **`CB1004RNZF4TZ3G5OKQJC`** with the same fields, except `discountPercent: 100` and `maxRedemptions: 4` (or your intended limit). **A non-empty `allowedEmails` array is mandatory for every 100% code**. With 100% off the server grants the pack in a Firestore transaction without contacting Razorpay, and logs the entitlement in `buddyLiveComplimentaryGrants`, with redemption counters in `buddyLiveCouponCounters` and per-user usage in `buddyLiveCouponUsers`. A given coupon cannot grant the same pack to the same email twice.

### Additional options

- `allowedPacks`: array. The valid IDs are `starter` (Premium ₹499), `intro` (Coaching ₹149), `standard` and `extended` (refills). Leave the array empty if the code is for all packs.
- `allowedEmails`: array of email strings (lower/upper case accepted). Empty is allowed for discounts **below 100%**, but only use that for publicly available offers. A 100% coupon **must** have an explicit allowlist.
- `startsAt` / `expiresAt`: optional Firestore timestamp or Unix milliseconds (number). Restricts when a coupon can be applied. If omitted, no date limit.
- `active`: set to `false` to disable a code immediately for future checkout requests.
- `maxRedemptions` and `maxPerEmail`: both required positive integers (max 10,000 overall and max 20 per email respectively). Choose conservative caps for test coupons.

**Important safeguards:** Only the trusted Firebase Admin SDK on the server is used to read these documents. Do not permit public Firestore clients to write `buddyLiveCoupons`, `buddyLiveCouponCounters`, `buddyLiveCouponUsers`, `buddyLiveComplimentaryGrants`, or `buddyLivePayments`. Check your Firestore Security Rules. Percentage discounts reserve a coupon use at order creation and consume it only after payment capture. If a user cancels checkout, the use is released; the payment order remains in the ledger for possible delayed capture. Abandoned checkouts that are never revisited may retain a reservation until reconciled; the reservations/counters should be monitored during the pilot. A captured payment must always be fulfilled even if the user has left the checkout page.

No new environment variables are necessary. Continue using your existing Razorpay live API keys and verified webhook secret. Keep `LIVE_PAID_CHECKOUT_ENABLED=0` until you are ready to accept real customer payments; set it to `1` only after you have verified the webhook. 100% redemptions do not require Razorpay to be active, but still require a correctly configured live Career Buddy server.
