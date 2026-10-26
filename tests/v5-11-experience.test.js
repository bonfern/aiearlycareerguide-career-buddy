import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EMPTY_PROFILE} from '../api/_lib/domain.js';
import {guidedProgress,validateQuickAnswer,addQuickAnswer,rewindFreeAnswers,FREE_QUESTION_IDS} from '../api/_lib/quickflow.js';

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const svc=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');

test('all seven free questions remain cost-free and can be rewound without AI calls',()=>{
 let profile={...EMPTY_PROFILE},answers={},extras={};
 const choices={employmentStatus:'Employed full-time',currentRole:'Process Excellence Manager',experience:'Over 20 years',goal:'Get promoted',targetRole:'Director of Process Excellence',roleExperience:['Lean Six Sigma and process improvement','Transformation programme delivery'],gaps:'Strategic planning and benefits realisation'};
 for(const id of FREE_QUESTION_IDS){
  const q=guidedProgress(profile,answers,[],'free').question;
  assert.equal(q.id,id);
  const a=validateQuickAnswer(q,{value:choices[id]});profile=addQuickAnswer(profile,q,a);answers[id]=a.value;
 }
 assert.equal(guidedProgress(profile,answers,[],'free').finished,true);
 for(let n=6;n>=0;n--){
  const back=rewindFreeAnswers(answers,extras,profile);
  assert.equal(back.previousId,FREE_QUESTION_IDS[n]);
  profile=back.profile;answers=back.answers;extras=back.extras;
  assert.equal(guidedProgress(profile,answers,[],'free').question.id,FREE_QUESTION_IDS[n]);
 }
 assert.equal(profile.targetRole,'');assert.deepEqual(profile.roleExperience,[]);
 assert.match(svc,/async function quickBack\(/);
 assert.match(svc,/if\(s\.freeReport\|\|isPaid\(s\)\|\|s\.report\)/);
 assert.match(app,/api\('quickBack',\{\}\)/);
});

test('changing target role drops previous role competencies and validates selected options again',()=>{
 const old={...EMPTY_PROFILE,employmentStatus:'Employed full-time',currentRole:'Product Manager',experience:'8–12 years',goal:'Get promoted',targetRole:'Director of Process Excellence',roleExperience:['Lean Six Sigma and process improvement','Transformation programme delivery'],gaps:['Strategic planning and benefits realisation']};
 const answers={employmentStatus:old.employmentStatus,currentRole:old.currentRole,experience:old.experience,goal:old.goal,targetRole:old.targetRole,roleExperience:old.roleExperience,gaps:old.gaps[0]};
 let current=old,next=answers;
 for(const id of ['gaps','roleExperience','targetRole']){
  const state=rewindFreeAnswers(next,{},current);assert.equal(state.previousId,id);
  current=state.profile;next=state.answers;
 }
 assert.equal(current.targetRole,'');assert.deepEqual(current.roleExperience,[]);assert.deepEqual(current.gaps,[]);
});

test('legacy Other descriptions survive a back operation without an OpenAI call',()=>{
 const answers={employmentStatus:'Employed full-time',currentRole:'Analyst',experience:'4–7 years',goal:'Get promoted',targetRole:'Product Manager',roleExperience:['Product strategy and roadmaps','Other'],gaps:'Prioritising features and trade-offs'};
 const profile={...EMPTY_PROFILE,...answers,roleExperience:['Product strategy and roadmaps','Customer segmentation interviews'],skills:['Product strategy and roadmaps','Customer segmentation interviews'],gaps:['Prioritising features and trade-offs']};
 const result=rewindFreeAnswers(answers,{},profile);
 assert.equal(result.previousId,'gaps');
 assert.ok(result.profile.roleExperience.includes('Customer segmentation interviews'));
});

test('Career Buddy info pages, home link, no money-back guarantee, revised free preview and mobile visuals',()=>{
 assert.match(html,/class="site-home" href="https:\/\/www\.aiearlycareerguide\.com\/"/);
 assert.match(html,/PRESENTS <span class="buddy-eyebrow">AYESHA · YOUR CAREER BUDDY/);
 for(const path of ['know-more.html','faq.html','privacy.html','terms.html','refund.html','contact.html']){
  assert.match(html,new RegExp('\\./'+path.replace('.','\\.')));
  assert.ok(fs.existsSync(new URL('../'+path,import.meta.url)));
 }
 assert.doesNotMatch(html,/money.back guarantee/i);
 assert.doesNotMatch(app,/addList\(view,'Five practical next steps'/);
 assert.match(app,/What we need to check next \(Premium Assessment\)/);
 const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.match(css,/url\('\.\/career-coaching\.webp'\)/);
 assert.match(css,/@media\(max-width:650px\)/);
});

test('both real paid model packs are retained with idempotent server-side payment verification',()=>{
 assert.match(svc,/createLiveCheckout/);
 assert.match(svc,/verifyLiveCheckout/);
 assert.match(svc,/checkLiveCheckout/);
 assert.match(svc,/livePaymentStatus/);
 assert.match(app,/activate\('starter','starterCoupon'\)/);
 assert.match(app,/activate\('intro','introCoupon'\)/);
});
