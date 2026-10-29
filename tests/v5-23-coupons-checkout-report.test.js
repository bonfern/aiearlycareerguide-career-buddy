import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveLiveCoupon,parseFirestoreCoupon,couponCounterRef,couponUserRef} from '../api/_lib/firestore-coupons.js';
import {grantFullCoupon,releaseAbandonedLiveCheckout} from '../api/service.js';
import {grantCapturedLivePayment} from '../api/_lib/live-grants.js';
import {buildSnapshotV2} from '../api/_lib/free-snapshot-content.js';
import {buildFreeSnapshotPdf} from '../api/_lib/free-snapshot-pdf.js';
import fs from 'node:fs';
function fakeStore(){
 const map=new Map();
 const ref=(path)=>({path,id:path.split('/').at(-1),get:async()=>({exists:map.has(path),data:()=>map.get(path)})});
 return {map,collection(name){return {doc(id){return ref(name+'/'+id);}}},async runTransaction(work){
  const pending=[];let wrote=false;
  const tx={get:async r=>{assert.equal(wrote,false,'Firestore transactions must complete reads before writes');return {exists:map.has(r.path),data:()=>map.get(r.path)};},
   set:(r,v)=>{wrote=true;pending.push(()=>map.set(r.path,v));},update:(r,v)=>{wrote=true;pending.push(()=>map.set(r.path,{...map.get(r.path),...v}));},create:(r,v)=>{wrote=true;pending.push(()=>{if(map.has(r.path))throw Error('Already exists');map.set(r.path,v);});}};
  const result=await work(tx);pending.forEach(x=>x());return result;
 }};
}
function seedSession(store,id='u1',email='owner@example.org'){
 const ref=store.collection('buddyLiveEmailSessions').doc(id);
 const data={id,email,freeReport:{profileSummary:'Ready'},profile:{assessmentTargetRole:'Data Analyst'},tier:'free',credits:0,creditsGranted:0,expiresAt:0,previewOrders:[]};store.map.set(ref.path,data);return {ref,data};
}
test('Firestore 99% coupon can be created without redeploy and is restricted to email and packs',async()=>{
 const store=fakeStore(),code='CBPAY99';store.map.set('buddyLiveCoupons/'+code,{active:true,discountPercent:99,allowedEmails:['owner@example.org'],allowedPacks:['starter','intro'],maxRedemptions:5,maxPerEmail:2});
 const r=await resolveLiveCoupon(store,{packId:'starter',couponCode:code,email:'OWNER@example.org'});
 assert.equal(r.offer.priceInr,5);assert.equal(r.offer.discountPercent,99);assert.equal(r.couponRule.source,'firestore');
 const intro=await resolveLiveCoupon(store,{packId:'intro',couponCode:code,email:'owner@example.org'});assert.equal(intro.offer.priceInr,1);
 await assert.rejects(resolveLiveCoupon(store,{packId:'standard',couponCode:code,email:'owner@example.org'}),/does not apply/);
 await assert.rejects(resolveLiveCoupon(store,{packId:'starter',couponCode:code,email:'stranger@example.org'}),/not available/);
});
test('100% coupons require a verified-email allowlist and cannot be unlimited',async()=>{
 const store=fakeStore(),code='CBOWNER100';store.map.set('buddyLiveCoupons/'+code,{active:true,discountPercent:100,allowedEmails:['owner@example.org'],maxRedemptions:2,maxPerEmail:1});
 const {ref}=seedSession(store);
 const {offer,couponRule}=await resolveLiveCoupon(store,{packId:'intro',couponCode:code,email:'owner@example.org'});
 assert.equal(offer.priceInr,0);
 const result=await grantFullCoupon(store,ref,offer,'11111111-1111-4111-8111-111111111111',couponRule);
 assert.equal(result.state.credits,12);
 const count=(await couponCounterRef(store,code).get()).data();assert.equal(count.count,1);
 assert.equal((await couponUserRef(store,'u1').get()).data().redemptions.length,1);
 await assert.rejects(grantFullCoupon(store,ref,offer,'22222222-2222-4222-8222-222222222222',couponRule),/already been redeemed/);
 assert.throws(()=>parseFirestoreCoupon(code,{active:true,discountPercent:100,maxRedemptions:3,maxPerEmail:1},'owner@example.org','starter'),/approved email/);
});
test('cancelled checkout releases pending lock but keeps order for late capture',async()=>{
 const store=fakeStore(),{ref,data}=seedSession(store);const id='order_Cancel123';
 store.map.set(ref.path,{...data,pendingLiveCheckout:{orderId:id,packId:'intro',coupon:null,at:Date.now(),amountPaise:14900}});
 const order={orderId:id,sessionId:'u1',packId:'intro',credits:12,days:14,priceInr:149,amountPaise:14900,kind:'razorpay-live'};
 store.map.set('buddyLivePayments/'+id,order);
 const released=await releaseAbandonedLiveCheckout(store,ref,store.map.get(ref.path),id,async()=>({items:[]}));
 assert.equal(released.released,true);assert.equal(released.state.pendingLiveCheckout,null);
 assert.ok(released.state.unsettledLiveCheckoutIds.includes(id));
 assert.equal(store.map.get('buddyLivePayments/'+id).status,'abandoned');
 // A later paid event is still legitimate. Fulfil it once, without downgrading
 // an existing paid entitlement or losing the full payment ledger.
 store.map.set(ref.path,{...store.map.get(ref.path),tier:'paid'});
 const payment={id:'pay_Late123',order_id:id,status:'captured',captured:true,amount:14900,currency:'INR'};
 const after=await grantCapturedLivePayment(store,order,payment);
 assert.equal(after.credits,12);assert.equal(after.tier,'paid');assert.equal(after.unsettledLiveCheckoutIds.includes(id),false);
 assert.equal((await grantCapturedLivePayment(store,order,payment)).credits,12);
});
test('captured order found during checkout dismissal is fulfilled rather than discarded',async()=>{
 const store=fakeStore(),{ref,data}=seedSession(store);const id='order_Paid123',order={orderId:id,sessionId:'u1',packId:'starter',credits:40,days:30,priceInr:499,amountPaise:49900,kind:'razorpay-live'};
 store.map.set(ref.path,{...data,pendingLiveCheckout:{orderId:id,at:Date.now(),packId:'starter'}});
 store.map.set('buddyLivePayments/'+id,order);
 const payment={id:'pay_Paid123',order_id:id,status:'captured',captured:true,amount:49900,currency:'INR'};
 const result=await releaseAbandonedLiveCheckout(store,ref,store.map.get(ref.path),id,async()=>({items:[payment]}));
 assert.equal(result.paid,true);assert.equal(result.state.tier,'paid');assert.equal(result.state.credits,40);
});
test('percentage coupon reserves a slot and fulfils it on verified capture',async()=>{
 const store=fakeStore(),{ref,data}=seedSession(store);const code='CB99NEW',id='order_CouponABC';
 const coupon= {active:true,discountPercent:99,maxRedemptions:2,maxPerEmail:1,allowedEmails:['owner@example.org']};store.map.set('buddyLiveCoupons/'+code,coupon);
 const refCounter=couponCounterRef(store,code),refUser=couponUserRef(store,'u1');
 store.map.set(refCounter.path,{count:0,pending:1});store.map.set(refUser.path,{pending:[{code,packId:'starter',orderId:id}]});
 const order={orderId:id,sessionId:'u1',packId:'starter',credits:40,days:30,priceInr:5,coupon:code,discountPercent:99,amountPaise:500,kind:'razorpay-live',couponSource:'firestore',couponReserved:true};store.map.set('buddyLivePayments/'+id,order);
 const payment={id:'pay_CouponABC',order_id:id,status:'captured',captured:true,amount:500,currency:'INR'};
 await grantCapturedLivePayment(store,order,payment);
 assert.equal(store.map.get(refCounter.path).pending,0);assert.equal(store.map.get(refCounter.path).count,1);
 assert.equal(store.map.get(refUser.path).redemptions.length,1);
 await grantCapturedLivePayment(store,order,payment);assert.equal(store.map.get(refCounter.path).count,1);
});
test('free report includes four role skills and keeps Premium at bottom',()=>{
 const guidance={targetCompetencies:[1,2,3,4,5].map(i=>({title:`Required skill ${i}`,bullets:[`This is a practical example of the role's essential skill number ${i}.`,`Deliver practical work demonstrating the relevant capability number ${i}.`]})),nextSteps:[1,2,3,4,5].map(i=>({title:`Prepare task ${i}`,bullets:[`Start a concrete task connected with the target career direction number ${i}.`,`Create a useful example and record the outcome from task number ${i}.`]}))};
 const p={freeIntakeVersion:21,careerStage:'Early Career (0-3 years)',targetGoalRole:'Data Analyst',careerPriorities:['Grow in my role'],personalStrengths:['Analysing data'],educationLevel:"Bachelor's Degree",careerBarriers:['Technical gaps'],learningTime:'1-3 hours'};
 const r=buildSnapshotV2(p,guidance);
 const pdf=buildFreeSnapshotPdf(r).toString('latin1');
 assert.ok(pdf.includes('Four important skills'));assert.ok(pdf.includes('Required skill 4'));assert.ok(!pdf.includes('Required skill 5:'));assert.ok(pdf.indexOf('Four important skills')<pdf.indexOf('Premium Assessment evaluates'));
 assert.ok(Number(pdf.match(/\/Count (\d+)/)?.[1])<=3);
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');assert.match(app,/free-role-skills/);
});
test('dismissed discounted checkout releases held coupon uses for another purchase',async()=>{
 const store=fakeStore(),{ref,data}=seedSession(store);const id='order_CouponCancel123',code='CBPAY99';
 const cRef=couponCounterRef(store,code),uRef=couponUserRef(store,'u1');
 store.map.set(cRef.path,{count:0,pending:1});
 store.map.set(uRef.path,{pending:[{code,packId:'intro',orderId:id}]});
 const order={orderId:id,sessionId:'u1',packId:'intro',coupon:code,credits:12,days:14,amountPaise:100,priceInr:1,kind:'razorpay-live',couponReserved:true,couponSource:'firestore'};
 store.map.set(ref.path,{...data,pendingLiveCheckout:{orderId:id,packId:'intro',coupon:code,at:Date.now()}});
 store.map.set('buddyLivePayments/'+id,order);
 const result=await releaseAbandonedLiveCheckout(store,ref,store.map.get(ref.path),id,async()=>({items:[]}));
 assert.equal(result.released,true);
 assert.equal(store.map.get(cRef.path).pending,0);
 assert.equal(store.map.get(uRef.path).pending.length,0);
 assert.equal(store.map.get('buddyLivePayments/'+id).couponReserved,false);
});
