import test from 'node:test';
import assert from 'node:assert/strict';
import {bucket,validateAnalyticsParams,summarizeCareerAnalytics,istDay} from '../api/_lib/analytics.js';
const t=s=>Date.parse(s);
const fake={
 sessions:[
  {id:'a',freeReportAt:t('2026-10-01T05:00:00Z'),reportGeneratedAt:t('2026-10-03T10:00:00Z')},
  {id:'b',freeReportAt:t('2026-10-01T06:00:00Z')},
  {id:'c',freeReportAt:t('2026-10-01T07:00:00Z'),messages:[{role:'assistant',at:t('2026-10-03T12:00:00Z')}]},
  {id:'e',freeReportAt:t('2026-10-30T08:00:00Z')}
 ],
 payments:[
  {id:'one',sessionId:'a',packId:'starter',granted:true,status:'captured',grantedAt:t('2026-10-02T07:00:00Z'),amountPaise:49900},
  {id:'two',sessionId:'c',packId:'intro',granted:true,status:'captured',grantedAt:t('2026-10-03T07:00:00Z'),amountPaise:14900},
  {id:'unsuccessful',sessionId:'b',packId:'starter',granted:false,status:'created',grantedAt:t('2026-10-03T07:00:00Z'),amountPaise:49900},
  {id:'outsider',sessionId:'someone',packId:'starter',granted:true,status:'captured',grantedAt:t('2026-10-03T08:00:00Z'),amountPaise:49900},
  {id:'refill',sessionId:'c',packId:'standard',granted:true,status:'captured',grantedAt:t('2026-10-03T09:00:00Z'),amountPaise:24900}
 ],
 complimentary:[{id:'coupon',sessionId:'b',packId:'intro',priceInr:0,at:t('2026-10-03T07:00:00Z')}]
};
const p={grain:'month',from:'2026-10-01',to:'2026-10-31',window:'30'};
test('analytics counts verified paid, free and complimentary separately',()=>{
 const d=summarizeCareerAnalytics(fake,p,t('2026-10-31T12:00:00Z'));
 assert.equal(d.summary.freeCompleted,4);
 assert.equal(d.summary.premiumBuyers,2);
 assert.equal(d.summary.buddyBuyers,1);
 assert.equal(d.summary.buddyCouponUsers,1);
 assert.equal(d.summary.premiumCouponUsers,0);
 assert.equal(d.summary.paidFromFreePremium,1);
 assert.equal(d.summary.paidFromFreeBuddy,1);
 assert.equal(d.summary.paidFromFreeAny,2);
 assert.equal(d.summary.freeToPremiumPct,25);
 assert.equal(d.summary.freeToBuddyPct,25);
 assert.equal(d.summary.freeToAnyPct,50);
 assert.equal(d.summary.premiumReportsCompleted,1);
 assert.equal(d.summary.coachingActiveUsers,1);
 assert.equal(d.summary.refillPurchases,1);
 assert.equal(d.summary.grossReceiptsInr,1396);
 assert.ok(d.range.provisional);
});
test('a cohort excludes paid purchases made outside its conversion window',()=>{
 const d=summarizeCareerAnalytics(fake,{...p,window:'7'},t('2026-11-10T11:00:00Z'));
 assert.equal(d.range.provisional,false);
 assert.equal(d.summary.paidFromFreePremium,1);
});
test('IST boundaries, Monday week start, and valid date ranges',()=>{
 assert.equal(istDay(t('2026-09-30T20:00:00Z')),'2026-10-01');
 assert.equal(bucket(t('2026-10-04T17:59:00Z'),'week'),'2026-09-28');
 assert.equal(bucket(t('2026-10-04T18:30:00Z'),'week'),'2026-10-05');
 assert.throws(()=>validateAnalyticsParams({grain:'day',from:'2026-01-01',to:'2026-10-31',window:'30'}),/shorter range/);
 assert.throws(()=>validateAnalyticsParams({...p,from:'2026-02-30'}),/valid/);
 assert.throws(()=>validateAnalyticsParams({...p,window:'5'}),/window/);
});
