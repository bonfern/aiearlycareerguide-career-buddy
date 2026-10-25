# Release gates (human sign-off required)
- Confirm Career Buddy **Production** deployment is distinct from Student and Recruiter deployments, and backend runs `/api/service` and `/api/razorpay-webhook` without preview access restrictions.
- Confirm exact 100% code allows only authorised email addresses, one pack per user, and credits cannot be granted twice.
- Confirm Razorpay live payment webhook signs raw request, status is `captured`, matching paid order amount/currency, no duplicate grants, and refund/chargeback support is operational.
- Confirm payments `LIVE_PAID_CHECKOUT_ENABLED=0` until authorised real charge test + webhook verification, then set `1` only after reconciliation. This is **not** a production payment certification.
- Add Vercel WAF rules for brute-force OTP and free report abuse. The basic IP/day limit is best-effort, not a substitute for WAF.
- Update public terms, privacy and refund policies: current main-site policies are Student-specific and refund page mentions ₹299. Seek legal review covering adult resume data, AI guidance, retention/deletion, coaching credits, expiration and ₹499 prices.
- Confirm report and resume content quality, mobile browsers, PDF/DOCX downloads, assessment question validation, support, transactional emails and cost alerts.
- Make the main-site rewrite change **last**. Roll back by restoring the previous main-site `vercel.json` `/professionals` rewrites.
