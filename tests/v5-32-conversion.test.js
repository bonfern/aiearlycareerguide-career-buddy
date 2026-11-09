import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FREE_INTAKE_VERSION,FREE_QUESTION_IDS,activeFreeQuestions,applyFreeAnswers,freeIntakeComplete,isExploringGoal} from '../api/_lib/free-intake.js';
import {freeReadiness} from '../api/_lib/domain.js';
import {FREE_SNAPSHOT_VERSION,buildSnapshotV2,validRoleGuidance,isSnapshotV2,targetRolePreserved} from '../api/_lib/free-snapshot-content.js';
import {buildFreeSnapshotPdf} from '../api/_lib/free-snapshot-pdf.js';
import {requireCheckoutEmail,linkHash,isCheckoutIdentity,RETURN_URL} from '../api/_lib/paid-return-link.js';
import {emailKey} from '../api/_lib/identity.js';
const text=n=>Array.from({length:n},(_,i)=>({title:'Relevant executive competency '+(i+1),bullets:['Lead enterprise-wide transformation, governance and business value outcomes.','Present financial value realisation scorecards to executive steering groups.']}));
const guidance={targetCompetencies:text(4),nextSteps:text(5)};
const answers={careerStage:'Senior Leader / Executive',currentRole:'Head of Shared Services',targetGoalRole:'VP Process Excellence',careerPriorities:['Get promoted'],personalStrengths:['Leading and motivating others'],educationLevel:'MBA',careerBarriers:['Limited time for learning'],learningTime:'1-3 hours'};
test('V5.32 asks current designation before target role, requiring it for new free intakes',()=>{
 assert.equal(FREE_INTAKE_VERSION,22);
 assert.equal(FREE_QUESTION_IDS[1],'currentRole');assert.equal(FREE_QUESTION_IDS[2],'targetGoalRole');
 assert.equal(freeIntakeComplete(answers),true);
 const p=applyFreeAnswers(answers);assert.equal(p.currentRole,'Head of Shared Services');assert.equal(p.targetGoalRole,'VP Process Excellence');
 assert.equal(freeReadiness(p).ready,true);
 const without={...answers};delete without.currentRole;assert.equal(freeIntakeComplete(without),false);
 assert.equal(freeReadiness(applyFreeAnswers(without)).ready,false);
});
test('student current status wording is appropriate and no invented employment is required',()=>{
 const q=activeFreeQuestions({careerStage:'College / University Student'}).find(x=>x.id==='currentRole');
 assert.match(q.text,/studying|qualification/i);
});
test('target VP report provides one same-seniority pathway and executive actions',()=>{
 const p=applyFreeAnswers(answers,{strengthEvidence:'Led a transformation programme'});
 const report=buildSnapshotV2(p,guidance,null);
 assert.equal(FREE_SNAPSHOT_VERSION,7);assert.equal(report.version,7);assert.equal(report.careerOpportunities.length,1);
 assert.match(report.careerOpportunities[0],/VP Process Excellence/);
 assert.doesNotMatch(report.careerOpportunities[0],/bridge pathway|entry-level|analyst role|manager role/i);
 assert.match(report.profileSummary,/Head of Shared Services/);
 assert.ok(report.nextBestMoves.every(x=>/enterprise|executive|cross-functional|governance|initiative|role profiles|achievement/.test(x)));
 assert.equal(isSnapshotV2(report),true);
 const pdf=buildFreeSnapshotPdf(report).toString('latin1');
 assert.match(pdf,/Your chosen target role/);assert.doesNotMatch(pdf,/Three career pathways/);
 assert.match(pdf,/VP Process Excellence/);assert.ok(Number(pdf.match(/\/Count (\d+)/)?.[1])<=3);
});
test('role preservation rejects a downgraded or substituted recommendation',()=>{
 assert.equal(targetRolePreserved({careerOpportunities:['Manager Process Excellence — start here']},'VP Process Excellence'),false);
 assert.equal(targetRolePreserved({careerOpportunities:['VP Process Excellence — your stated aspiration']},'VP Process Excellence'),true);
});
test('exploring career direction still gets three paths',()=>{
 const p=applyFreeAnswers({...answers,targetGoalRole:'Still exploring',interestFields:['Operations & Supply Chain','Consulting']});
 const report=buildSnapshotV2(p,guidance,null);
 assert.equal(report.careerOpportunities.length,3);assert.equal(isSnapshotV2(report),true);
});
test('email checks do not assert ownership or allow common mistakes',()=>{
 const valid={email:'BUYER@Example.com',privacyConsent:true,adultConfirmed:true,consentVersion:'v532'};
 assert.equal(requireCheckoutEmail(valid,'v532'),'buyer@example.com');
 assert.throws(()=>requireCheckoutEmail({...valid,email:'someone@gmial.com'},'v532'),/spelling/i);
 assert.throws(()=>requireCheckoutEmail({...valid,adultConfirmed:false},'v532'),/privacy terms/i);
 assert.throws(()=>requireCheckoutEmail({...valid,consentVersion:'wrong'},'v532'),/privacy terms/i);
 assert.throws(()=>requireCheckoutEmail({...valid,email:'nonsense'},'v532'),/valid email/i);
});
test('return link tokens bind to a secret; checkout email is never treated as verified',()=>{
 const secret='s'.repeat(40),token='1'.repeat(64);
 assert.equal(linkHash(token,secret).length,64);assert.notEqual(linkHash(token,secret),linkHash(token,'t'.repeat(40)));
 assert.throws(()=>linkHash('bad',secret),/Invalid/);
 assert.equal(isCheckoutIdentity({email:'buyer@example.com',emailVerified:false,authMethod:'checkout-email-unverified'}),true);
 assert.equal(isCheckoutIdentity({email:'buyer@example.com',emailVerified:true,authMethod:'email-return-link'}),false);
 assert.ok(RETURN_URL.startsWith('https://www.aiearlycareerguide.com/professionals/'));
});
test('paid accounts are random IDs while coupon limits remain per email',()=>{
 const source=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 assert.match(source,/const id=guestSessionId\(\),t=now\(\),sRef/);
 assert.match(source,/id,guest:false,email,emailVerified:false,authMethod:'checkout-email-unverified'/);
 assert.match(source,/couponUserRef\(store,emailKey\(cur.email\)\)/);
 assert.match(source,/s.emailVerified===false\|\|!isFeedbackAdmin\(s.email\)/);
 assert.notEqual(emailKey('buyer@example.com'),'1'.repeat(64));
});
test('checkout UI combines email and coupon inside premium and coaching offers',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 for(const id of ['checkoutEmailStarter','checkoutEmailIntro','checkoutConsentStarter','checkoutConsentIntro','paidRecoveryPanel','correctPaidEmail'])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(app,/checkoutIdentity/);assert.match(app,/recoverCheckout/);assert.match(app,/ensureCheckoutIdentity/);
});
