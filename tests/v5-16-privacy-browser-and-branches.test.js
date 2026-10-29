import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {browserClaimKey,browserAccess} from '../api/_lib/free-browser.js';
import {verificationMessage,CONSENT_VERSION} from '../api/_lib/auth-email.js';
import {FREE_QUESTION_IDS,guidedProgress,validateQuickAnswer,addQuickAnswer,NO_EXPERIENCE} from '../api/_lib/quickflow.js';
import {EMPTY_PROFILE,freeReadiness} from '../api/_lib/domain.js';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');

test('the branded six-digit email includes accessible text fallback and no third-party instructions',()=>{
 const email=verificationMessage('702963');
 assert.match(email.subject,/Career Buddy/);
 assert.match(email.html,/brand-logo\.webp/);
 assert.match(email.html,/702963/);
 assert.match(email.html,/10 minutes/);
 assert.match(email.text,/702963/);
 assert.match(email.text,/AI Early Career Guide/);
 assert.throws(()=>verificationMessage('<script>'),/Invalid code/);
});
test('the consent is mandatory on frontend and backend and versioned with verified sessions',()=>{
 assert.ok(html.includes('id="privacyConsent" type="checkbox" required'));
 assert.ok(html.includes('id="adultConsent" type="checkbox" required'));
 assert.ok(html.includes('id="resumeConsent" type="checkbox"'));
 assert.match(server,/body\.privacyConsent!==true\|\|body\.adultConsent!==true/);
 assert.match(server,/consent:result/);
 assert.match(server,/body\.resumeConsent!==true/);
 assert.match(app,/resumeConsent:true/);
 assert.match(server,/challenge\.consent\?\.version!==CONSENT_VERSION/);
 assert.match(CONSENT_VERSION,/2026-10-27/);
});
test('free browser claim identities are random and only an original account may continue',()=>{
 const one=randomUUID(),two=randomUUID(),key='x'.repeat(36);
 const first=browserClaimKey(one,key),second=browserClaimKey(two,key);
 assert.equal(first.length,64);assert.notEqual(first,second);
 assert.equal(browserClaimKey(one,key),first);
 assert.ok(browserAccess(undefined,'account1'));
 assert.ok(browserAccess({ownerId:'account1'},'account1'));
 assert.equal(browserAccess({ownerId:'account1'},'account2'),false);
 assert.throws(()=>browserClaimKey('email@example.com',key),/Browser storage/);
 assert.match(server,/buddyFreeBrowserClaimsV1/);
 assert.match(server,/assertFreeBrowser\(browserClaimFromSnapshot\(bSnap\),s\.id\)/);
});
test.skip('nine questions ask goal before experience and student without a job can get a snapshot [superseded by V5.18 13-question specification]',()=>{
 assert.deepEqual(FREE_QUESTION_IDS,['employmentStatus','goal','targetRole','currentRole','experience','roleExperience','gaps','applicationDepth','evidenceExample']);
 let profile={...EMPTY_PROFILE},answers={};
 const values={employmentStatus:'Student',goal:'Explore career options',targetRole:'Data Analyst',currentRole:'BSc Statistics',experience:'No experience yet',roleExperience:[NO_EXPERIENCE],gaps:'Not sure yet',applicationDepth:'Just exploring; no related learning or practice yet',evidenceExample:'I analysed survey responses for a college project'};
 for(const id of FREE_QUESTION_IDS){
  const q=guidedProgress(profile,answers,[],'free').question;
  assert.equal(q.id,id);
  if(id==='goal')assert.ok(q.options.includes('Explore career options'));
  if(id==='currentRole')assert.match(q.text,/course|subject/i);
  if(id==='experience')assert.ok(q.options.includes('No experience yet'));
  if(id==='roleExperience')assert.match(q.text,/class|project|internship/i);
  const a=validateQuickAnswer(q,{value:values[id]});
  profile=addQuickAnswer(profile,q,a);answers[id]=a.value;
 }
 assert.equal(freeReadiness(profile).ready,true);
 assert.equal(guidedProgress(profile,answers,[],'free').finished,true);
});
test('Career Buddy naming and logo are consistent across main and informational pages',()=>{
 assert.doesNotMatch(html,/Ayesha/i);
 assert.match(html,/Get my free career snapshot/);
 assert.match(css,/font-size:clamp\(13px,1\.1vw,15px\);font-weight:400/);
 const sheet=fs.readFileSync(new URL('../info.css',import.meta.url),'utf8');
 assert.match(sheet,/\.top \.brand img/);
 for(const page of ['know-more','faq','privacy','terms','refund','contact']){
  const source=fs.readFileSync(new URL(`../${page}.html`,import.meta.url),'utf8');
  assert.match(source,/brand-logo\.webp/);
  assert.match(source,/info\.css\?v=5\.16/);
  assert.match(source,/Career Buddy/);
  assert.doesNotMatch(source,/Ayesha/i);
 }
});
