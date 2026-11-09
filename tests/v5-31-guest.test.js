import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {guestSessionId,guestExpiry,guestAllowed,visitorKey,funnelDay,assertGuestOrigin} from '../api/_lib/guest-flow.js';
import {signCookie,verifyCookie} from '../api/_lib/identity.js';
const source=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const secret='a'.repeat(48);
test('guest IDs and cookies are secure, signed, unique and expire',()=>{
 const a=guestSessionId(),b=guestSessionId();
 assert.match(a,/^[0-9a-f]{64}$/);assert.notEqual(a,b);
 assert.equal(verifyCookie(signCookie(a,secret),secret),a);
 assert.equal(verifyCookie(signCookie(a,secret),secret+'different'),null);
 assert.equal(guestExpiry(0),7*86400000);
});
test('guest start requires affirmative action with the current privacy notice and adult declaration',()=>{
 const consentVersion='career-buddy-privacy-2026-10-27';
 assert.doesNotThrow(()=>assertGuestOrigin({adultConfirmed:true,privacyAccepted:true,consentVersion},{consentVersion}));
 for(const obj of [{adultConfirmed:false,privacyAccepted:true,consentVersion},{adultConfirmed:true,privacyAccepted:false,consentVersion},{adultConfirmed:true,privacyAccepted:true,consentVersion:'old'}]){
  assert.throws(()=>assertGuestOrigin(obj,{consentVersion}),/at least 18/);
 }
 assert.match(html,/guest-privacy-note/);
 assert.match(html,/Privacy Policy/);
});
test('guest cannot access paid, coaching, coupons, feedback or dashboards',()=>{
 for(const endpoint of ['liveCheckout','couponStatus','livePaymentVerify','testCheckout','mockPurchase','reviewResume','report','chat','feedbackSubmit','analyticsSummary','adminState','assessmentStart','assessmentAnswer','setAssessmentRole']){
  assert.equal(guestAllowed(endpoint),false,endpoint);
 }
 for(const endpoint of ['state','quick','quickBack','freeReport','download','setJourney','guestStart']){
  assert.equal(guestAllowed(endpoint),true,endpoint);
 }
 assert.match(source,/if\(isGuest&&!guestAllowed\(action\)/);
 assert.match(source,/isGuest=!verifiedId/);
});
test('first-party funnel IDs do not use email or reveal career text',()=>{
 const id='e014846f-8c7c-4058-953c-7a5c35811d05';
 const k=visitorKey(id,secret);
 assert.match(k,/^[a-f0-9]{64}$/);
 assert.equal(k,visitorKey(id,secret));
 assert.notEqual(k,visitorKey('aa28ee5a-00c0-44a0-9091-b1d1412ffce7',secret));
 assert.equal(visitorKey('not-an-uuid',secret),null);
 assert.equal(funnelDay(Date.parse('2026-11-09T18:29:59Z')),'2026-11-09');
 assert.equal(funnelDay(Date.parse('2026-11-09T18:30:00Z')),'2026-11-10');
 assert.match(source,/landing_view/);assert.match(source,/snapshot_generated/);
});
test('V5.31 preserves premium verification and copies guest snapshot into a verified session',()=>{
 assert.match(source,/const transfer=guest/);
 assert.match(source,/freeReport:guest\.freeReport\|\|null/);
 assert.match(source,/tx\.set\(sessionRef,final\)/);
 assert.match(source,/tx\.delete\(guestRef\)/);
 assert.match(source,/guest-account-upgrade/);
 assert.match(app,/startVerification\('premium'\)/);
 assert.match(app,/startVerification\('coach'\)/);
 assert.match(app,/setJourney/);
});
test('marketing page has prominent free CTA and guest session start, with no signup requirement',()=>{
 assert.match(html,/Get Your <em>FREE Career Snapshot<\/em>/);
 assert.match(html,/No signup to start/);
 assert.match(html,/id="chooseAssessment"/);
 assert.match(css,/V5\.31 - mobile-first guest acquisition/);
 assert.match(app,/api\('guestStart'/);
 assert.match(app,/track\('free_cta_clicked'\)/);
});
