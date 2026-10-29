# AI Early Career Guide — Career Buddy V5.21

Separate Career Buddy application behind **https://www.aiearlycareerguide.com/professionals/**, deployed from the GitHub repository `aiearlycareerguide-career-buddy`. Do not upload to the old Professional Assessment or the main-website repository.

## Current Free Career Discovery

Seven questions with a conditional eighth **career interests** question when the user is still exploring. Multi-select questions allow **up to three** answers. A free snapshot gives career direction, reported strengths/tools, a transferable advantage, 2–3 possible pathways with reasoning, career alignment, two feasible next actions, and deeper-assessment considerations at the bottom. Free answers and Back do not use AI tokens.

**Latest changes:** see [V5_21_RELEASE_NOTES.md](V5_21_RELEASE_NOTES.md) for the question sequence, compatibility, testing and deployment instructions.

## Local validation

Run `npm test`. The production app requires existing Firebase, Resend, OpenAI, Razorpay and signed-session configuration. See [PRODUCTION-SETUP.md](PRODUCTION-SETUP.md) for infrastructure settings. Keep live payment security settings unchanged unless deliberately verifying a live transaction. Old release notes remain as historical references only.
