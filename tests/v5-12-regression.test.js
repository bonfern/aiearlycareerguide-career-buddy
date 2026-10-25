import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const svc=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');

test('Signed-in reload starts at landing page rather than forcibly opening an old snapshot',()=>{
 assert.match(app,/if\(state\)\{flow=state\.journeyPreference\|\|'free';\}show\('Choose'\);/);
 assert.doesNotMatch(app,/if\(state\)\{flow=state\.journeyPreference\|\|'free';goAssessment\(\);\}/);
});

test('Feedback toast clears when changing screen, including from failed checkout',()=>{
 assert.match(app,/if\(current!==screen\)notice\(''\)/);
});

test('Payment CTAs say Proceed and pricing card no longer appears selected',()=>{
 assert.match(html,/<button id="activateStarter"[^>]*>Proceed<\/button>/);
 assert.match(html,/<button id="activateIntro"[^>]*>Proceed<\/button>/);
 assert.match(app,/\['activateStarter','Proceed'\]/);
 assert.match(app,/\['activateIntro','Proceed'\]/);
 assert.doesNotMatch(app,/Review discount & proceed/);
 assert.match(css,/\.offer\{border:1px solid #dbe5ee/);
});

test('Checkout readiness reflects exact live gate including webhook; payment verification remains mandatory',()=>{
 assert.match(svc,/const liveCheckoutReady=\(\)=>paymentMode\(\)==='razorpay_live'/);
 assert.match(svc,/process\.env\.LIVE_PAID_CHECKOUT_ENABLED==='1'/);
 assert.match(svc,/RAZORPAY_LIVE_WEBHOOK_SECRET/);
 assert.match(svc,/if\(process\.env\.LIVE_PAID_CHECKOUT_ENABLED!=='1'\)fail\(403/);
 assert.match(svc,/validateCapturedPayment\(confirmed,record\)/);
 assert.match(app,/checkoutReady===false/);
 assert.match(app,/An eligible 100% complimentary coupon can still be redeemed/);
});
