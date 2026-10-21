import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKS,EMPTY_PROFILE,freeReadiness,reportReadiness,computeOffer,mergeProfile,creditWarning} from '../api/_lib/domain.js';
import {guidedProgress,validateQuickAnswer,addQuickAnswer,FREE_QUESTION_IDS} from '../api/_lib/quickflow.js';
const sample={employmentStatus:'Employed full-time',currentRole:'Process Excellence Manager',industry:'Manufacturing / FMCG',experience:'13+ years',goal:'Get promoted',targetRole:'Director of Process Excellence',timeframe:'6–12 months',responsibilities:['Leading projects'],skills:['Project planning','Process improvement'],gaps:['Strategic thinking']};
test('V3 price and pack entitlements are indicative and correct',()=>{
 assert.deepEqual(Object.keys(PACKS),['starter','standard','extended']);
 assert.deepEqual(Object.values(PACKS).map(p=>[p.priceInr,p.credits]),[[499,60],[249,35],[399,75]]);
});
test('Free snapshot needs basic profile but never requires experience examples or paid context',()=>{
 assert.equal(freeReadiness(EMPTY_PROFILE).ready,false);
 assert.equal(freeReadiness(sample).ready,true);
 assert.equal(reportReadiness(sample).ready,false);
});
test('Free stage has 10 simple questions; paid stage only asks missing paid fields',()=>{
 assert.equal(FREE_QUESTION_IDS.length,10);
 const free=guidedProgress(EMPTY_PROFILE,{},[],'free');assert.equal(free.total,10);
 assert.equal(free.question.id,'employmentStatus');
 const after=guidedProgress(sample,{},[],'paid');assert.equal(after.question.id,'constraints');
 assert.equal(guidedProgress(sample,{},[],'free').question,null);
});
test('Free profile is retained and paid examples unlock deeper report, without repeating earlier prompts',()=>{
 const p=mergeProfile(sample,{constraints:'5–8 hours each week',achievements:['Building an AI chatbot for HR queries','Led a cross-functional redesign of procurement operations']});
 assert.equal(reportReadiness(p).ready,true);
 assert.equal(guidedProgress(p,{},[],'paid').finished,true);
});
test('Coupons are calculated server-side, invalid coupons do not grant discounts',()=>{
 const coupons={EARLY30:30,TEST100:100};
 const a=computeOffer({packId:'starter',couponCode:'early30',coupons});
 assert.equal(a.priceInr,349);assert.equal(a.credits,60);assert.equal(a.discountPercent,30);
 const b=computeOffer({packId:'standard',coupons});assert.equal(b.priceInr,249);
 assert.equal(computeOffer({packId:'extended',couponCode:'TEST100',coupons}).priceInr,0);
 assert.throws(()=>computeOffer({packId:'starter',couponCode:'MADEUP',coupons}),/not valid/);
 assert.throws(()=>computeOffer({packId:'fake',coupons}),/Invalid pack/);
});
test('Alerts include 10, 5, 1 and 0 remaining credits',()=>{
 for(const n of [10,5,1,0])assert.ok(creditWarning(n));
});
test('Free question answers do not need AI and carry over deterministically',()=>{
 let p={...EMPTY_PROFILE},ans={};
 const values={employmentStatus:'Employed full-time',currentRole:'Process Excellence Manager',industry:'Manufacturing / FMCG',experience:'13+ years',goal:'Get promoted',targetRole:'Director of Process Excellence',timeframe:'6–12 months',responsibilities:['Leading projects'],skills:['Project planning','Process improvement'],gaps:'Strategic thinking'};
 for(const id of FREE_QUESTION_IDS){const q=guidedProgress(p,ans,[],'free').question;assert.equal(q.id,id);
  const a=validateQuickAnswer(q,{value:values[id]});p=addQuickAnswer(p,q,a);ans[id]=a.value;}
 assert.equal(guidedProgress(p,ans,[],'free').finished,true);
 assert.equal(freeReadiness(p).ready,true);
 assert.equal(guidedProgress(p,ans,[],'paid').question.id,'constraints');
});
