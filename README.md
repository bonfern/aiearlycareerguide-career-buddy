**Latest release: V5.25.** See `V5_25_RELEASE_NOTES.md` for the reliability fixes and `FIRESTORE_COUPONS_GUIDE.md` for coupons.

# AI Early Career Guide — Career Buddy V5.25

Separate Career Buddy application behind **https://www.aiearlycareerguide.com/professionals/**, deployed from the GitHub repository `aiearlycareerguide-career-buddy`. Do not upload to the old Professional Assessment or the main-website repository.

## Current Free Career Discovery

Seven questions with a conditional eighth **career interests** question when the user is still exploring. Multi-select questions allow **up to three** answers. The new free snapshot is a concise two-page career discovery report: current career direction and self-reported strengths; a transferable advantage; three ranked exploratory career pathways with reasons; and three immediate next moves. A short final section describes what the paid competency assessment evaluates. It does not publish readiness scores, detailed skill gaps, certifications, interview banks or a 30/60/90-day roadmap. Free answers and Back do not use AI tokens.

**Latest changes:** see [V5_25_RELEASE_NOTES.md](V5_25_RELEASE_NOTES.md) for assessment recovery and messaging improvements. Free discovery remains unchanged from V5.24.

## Local validation

Run `npm test`. The production app requires existing Firebase, Resend, OpenAI, Razorpay and signed-session configuration. See [PRODUCTION-SETUP.md](PRODUCTION-SETUP.md) for infrastructure settings. Keep live payment security settings unchanged unless deliberately verifying a live transaction. Old release notes remain as historical references only.
