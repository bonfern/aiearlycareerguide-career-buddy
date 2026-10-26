import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {paymentMode,assertLiveKeys,requirePrivateLiveSettings,approvedLiveTester,liveCoupons,canUseFullDiscount,razorpayLiveAPI,validWebhookSignature} from '../api/_lib/razorpay-live.js';
import {computeOffer} from '../api/_lib/domain.js';
import {grantCapturedLivePayment} from '../api/_lib/live-grants.js';
import {grantFullCoupon} from '../api/service.js';
const env={PAYMENT_FLOW_MODE:'razorpay_live',LIVE_PRIVATE_MODE:'1',LIVE_TESTER_EMAILS:'first@example.org, second@example.org',LIVE_FREE_COUPON_EMAILS:'first@example.org',LIVE_FREE_COUPON_CODE:'PILOT100',LIVE_COUPONS_JSON:'{"EARLY30":30}',RAZORPAY_LIVE_KEY_ID:'rzp_live_abcdefghijk',RAZORPAY_LIVE_KEY_SECRET:'live_secret_for_testing'};
test('private live environment rejects public use and test credentials',()=>{
 assert.equal(paymentMode(env),'razorpay_live');assert.equal(requirePrivateLiveSettings(env).id,env.RAZORPAY_LIVE_KEY_ID);
 assert.equal(approvedLiveTester('FIRST@example.org',env),true);assert.equal(approvedLiveTester('stranger@example.org',env),false);
 assert.throws(()=>requirePrivateLiveSettings({...env,LIVE_TESTER_EMAILS:''}),/LIVE_TESTER_EMAILS/);
 assert.throws(()=>assertLiveKeys({...env,RAZORPAY_LIVE_KEY_ID:'rzp_test_wrong'}),/LIVE/);
 assert.throws(()=>requirePrivateLiveSettings({...env,LIVE_PRIVATE_MODE:'0'}),/LIVE_PRIVATE_MODE/);
});
test('100% private coupon is allowlisted and leaves a zero-price order to bypass Razorpay',()=>{
 const offer=computeOffer({packId:'starter',couponCode:'PILOT100',coupons:liveCoupons(env)});
 assert.equal(offer.priceInr,0);assert.equal(offer.credits,40);
 assert.equal(canUseFullDiscount({email:'first@example.org',code:'PILOT100',env}),true);
 assert.equal(canUseFullDiscount({email:'second@example.org',code:'PILOT100',env}),false);
 assert.equal(canUseFullDiscount({email:'first@example.org',code:'EARLY30',env}),false);
 assert.equal(computeOffer({packId:'starter',couponCode:'EARLY30',coupons:liveCoupons(env)}).priceInr,349);
});
test('live Razorpay provider API refuses unsupported routes and uses live keys only',async()=>{
 const fake=async(url,opts)=>{assert.equal(url,'https://api.razorpay.com/v1/orders');assert.match(opts.headers.Authorization,/Basic/);return {ok:true,json:async()=>({id:'order_ABC',amount:49900,currency:'INR'})};};
 assert.equal((await razorpayLiveAPI('POST','/v1/orders',{amount:49900},env,fake)).amount,49900);
 await assert.rejects(razorpayLiveAPI('POST','/v1/unknown',{},env,fake),/Unsupported/);
});
test('webhooks must use HMAC of unchanged raw body',()=>{
 const b=Buffer.from('{"event":"payment.captured","payload":{}}');
 const sig=crypto.createHmac('sha256','webhooksecret0123456').update(b).digest('hex');
 assert.equal(validWebhookSignature(b,sig,'webhooksecret0123456'),true);
 assert.equal(validWebhookSignature(Buffer.from(b.toString()+' '),sig,'webhooksecret0123456'),false);
});
function fakeStore(){
 const map=new Map();const ref=(path)=>({path});
 return {map,collection(name){return {doc(id){return ref(name+'/'+id);}}},async runTransaction(work){const tx={get:async r=>({exists:map.has(r.path),data:()=>map.get(r.path)}),update:(r,obj)=>map.set(r.path,{...map.get(r.path),...obj})};return work(tx);}};
}
test('real-money fulfillment checks captured matching amount, grants credits once only',async()=>{
 const store=fakeStore(),orderId='order_AbC123',session='hash1';
 const record={orderId,sessionId:session,packId:'starter',credits:40,days:30,priceInr:499,discountPercent:0,amountPaise:49900};
 store.map.set('buddyLivePayments/'+orderId,record);
 store.map.set('buddyLiveEmailSessions/'+session,{id:session,email:'first@example.org',tier:'free',credits:0,creditsGranted:0,expiresAt:0,previewOrders:[]});
 const pay={id:'pay_AbC123',order_id:orderId,status:'captured',captured:true,amount:49900,currency:'INR'};
 const after=await grantCapturedLivePayment(store,record,pay);
 assert.equal(after.credits,40);assert.equal(after.tier,'paid');assert.equal(store.map.get('buddyLivePayments/'+orderId).granted,true);
 const retry=await grantCapturedLivePayment(store,record,pay);assert.equal(retry.credits,40);
});
test('source gates simulation and live charges separately',()=>{
 const service=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 const browser=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 for(const action of ['liveCheckout','livePaymentVerify','livePaymentStatus'])assert.match(service,new RegExp("action==='"+action+"'"));
 assert.match(service,/LIVE_PAID_CHECKOUT_ENABLED/);
 assert.match(service,/buddyLiveCouponUsers/);assert.match(service,/buddyLiveCouponCounters/);assert.match(service,/approvedLiveTester/);
 assert.match(service,/reset is disabled in the private live pilot/);
 assert.match(browser,/result\.kind==='complimentary'/);
});

test('100% coupon can be granted only once per verified email/pack, with an overall usage ceiling',async()=>{
 const before={};for(const key of ['LIVE_TESTER_EMAILS','LIVE_FREE_COUPON_EMAILS','LIVE_FREE_COUPON_CODE','LIVE_FREE_COUPON_MAX_PER_EMAIL','LIVE_FREE_COUPON_GLOBAL_LIMIT'])before[key]=process.env[key];
 Object.assign(process.env,{LIVE_TESTER_EMAILS:'first@example.org',LIVE_FREE_COUPON_EMAILS:'first@example.org',LIVE_FREE_COUPON_CODE:'PILOT100',LIVE_FREE_COUPON_MAX_PER_EMAIL:'2',LIVE_FREE_COUPON_GLOBAL_LIMIT:'2'});
 try{
  const store=fakeStore(),ref=store.collection('buddyLiveEmailSessions').doc('hash1');
  store.map.set(ref.path,{id:'hash1',email:'first@example.org',tier:'free',freeReport:{profileSummary:'Ready'},credits:0,creditsGranted:0,expiresAt:0,previewOrders:[]});
  const original=store.runTransaction;
  store.runTransaction=async callback=>callback({
   get:async r=>({exists:store.map.has(r.path),data:()=>store.map.get(r.path)}),
   update:(r,obj)=>store.map.set(r.path,{...store.map.get(r.path),...obj}),
   set:(r,obj)=>store.map.set(r.path,obj),
   create:(r,obj)=>{if(store.map.has(r.path))throw Error('Already exists');store.map.set(r.path,obj);}
  });
  const starter=computeOffer({packId:'starter',couponCode:'PILOT100',coupons:liveCoupons(env)});
  const id1='11111111-1111-4111-8111-111111111111';
  const first=await grantFullCoupon(store,ref,starter,id1);
  assert.equal(first.state.credits,40);assert.equal(first.state.tier,'paid');
  assert.equal((await grantFullCoupon(store,ref,starter,id1)).replayed,true);
  await assert.rejects(grantFullCoupon(store,ref,starter,'22222222-2222-4222-8222-222222222222'),/already been redeemed/);
  const refill=computeOffer({packId:'standard',couponCode:'PILOT100',coupons:liveCoupons(env)});
  const second=await grantFullCoupon(store,ref,refill,'33333333-3333-4333-8333-333333333333');
  assert.equal(second.state.credits,70);
  const third=computeOffer({packId:'extended',couponCode:'PILOT100',coupons:liveCoupons(env)});
  await assert.rejects(grantFullCoupon(store,ref,third,'44444444-4444-4444-8444-444444444444'),/limit/);
  assert.equal([...store.map.values()].filter(v=>v.kind==='approved-private-complimentary').length,2);
 }finally{for(const [k,v] of Object.entries(before))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
