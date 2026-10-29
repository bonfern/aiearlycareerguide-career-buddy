import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {responseIsPending,extractCompletedJson,reportUsage,reportStatusLabel} from '../api/_lib/report-background.js';
import {resolveLiveCoupon} from '../api/_lib/firestore-coupons.js';
const read=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8');
const html=read('../index.html'),app=read('../app.js'),api=read('../api/service.js'),css=read('../style.css');

test('reasoning report runs in recoverable provider background mode with short polling requests',()=>{
 assert.match(api,/background:true/);assert.match(api,/store:false,background:true/);
 assert.match(api,/reportJob:\{id:launched\.id,at:now\(\)\}/);
 assert.match(api,/if\(session\.reportJob\?\.id\)/);
 assert.match(api,/reportJob:null,busy:null/);
 assert.match(api,/REPORT_JOB_MAX_AGE/);
 assert.match(app,/reportPolling/);assert.match(app,/await new Promise\(resolve=>setTimeout\(resolve,5000\)\)/);
 assert.match(app,/if\(current==='Paid'\)\{show\('Toolkit'\)/);
});

test('provider response parsing supports queued and completed states, rejects invalid replies',()=>{
 assert.equal(responseIsPending({status:'queued'}),true);
 assert.equal(responseIsPending({status:'in_progress'}),true);
 assert.equal(responseIsPending({status:'completed'}),false);
 const completed={status:'completed',model:'reasoner',output:[{type:'message',content:[{type:'output_text',text:'{"summary":"works"}'}]}],usage:{input_tokens:50,output_tokens:70}};
 assert.deepEqual(extractCompletedJson(completed),{summary:'works'});
 assert.equal(reportUsage(completed).usage.completion_tokens,70);
 assert.throws(()=>extractCompletedJson({status:'failed'}),/status failed/);
 assert.throws(()=>extractCompletedJson({status:'completed',output:[]}),/no content/);
 assert.match(reportStatusLabel('interview'),/interview topics/);
});

test('valid Firestore BUDDY100 coupon works without redeploy, for configured verified email and pack',async()=>{
 const data={active:true,discountPercent:100,allowedEmails:['owner@example.org'],allowedPacks:['starter','intro'],maxRedemptions:4,maxPerEmail:2};
 const store={collection(name){assert.equal(name,'buddyLiveCoupons');return {doc(id){assert.equal(id,'BUDDY100');return {get:async()=>({exists:true,data:()=>data})};}}}};
 const valid=await resolveLiveCoupon(store,{packId:'intro',couponCode:'buddy100',email:'owner@example.org'});
 assert.equal(valid.offer.priceInr,0);
 assert.equal(valid.couponRule.source,'firestore');
 await assert.rejects(resolveLiveCoupon(store,{packId:'starter',couponCode:'BUDDY100',email:'other@example.org'}),/email/);
});

test('coupon status checks verified email, package eligibility, remaining limit without charging',()=>{
 assert.match(api,/async function couponStatus/);
 assert.match(api,/checkPackEligibility\(s,offer\.packId\)/);
 assert.match(api,/action==='couponStatus'/);
 assert.match(html,/id="checkStarterCoupon"/);
 assert.match(html,/id="checkIntroCoupon"/);
 assert.match(app,/api\('couponStatus'/);
});

test('premium assessment preparation warns of 2–3 minutes and keeps navigation available',()=>{
 assert.match(app,/usually takes 2–3 minutes/);
 assert.match(app,/assessmentPreparing=true/);
 assert.match(app,/if\(current==='Paid'\)paintPaidAssessment\(\)/);
 assert.match(html,/id="premiumNavButton"/);
 assert.match(html,/id="coachNavButton"/);
 assert.match(html,/Main website/);
 assert.match(app,/premiumNavButton/);
 assert.match(app,/coachNavButton/);
 assert.match(css,/@media\(min-width:881px\)/);
 assert.match(css,/\.hero-image\{align-self:center;width:100%;height:auto/);
});
