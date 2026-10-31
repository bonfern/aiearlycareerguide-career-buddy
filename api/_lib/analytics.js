/** Career Buddy business analytics, aggregated in memory after authenticated Firestore reads.
 * Production-only ledgers; no attempt or test checkout is counted as a paid purchase.
 * Do not return user identifiers or raw sessions to the browser.
 */
const IST_MS=330*60000;
const DAY=86400000;
const PACKS=new Set(['starter','intro','standard','extended']);
const VALID_GRAIN=new Set(['day','week','month','year']);
export function istDay(ts){return new Date(ts+IST_MS).toISOString().slice(0,10);}
const dateUtc=v=>Date.parse(v+'T00:00:00.000Z');
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(dateUtc(v))&&new Date(dateUtc(v)).toISOString().slice(0,10)===v;
export function validateAnalyticsParams(input={}){
 const grain=String(input.grain||'month'),from=String(input.from||''),to=String(input.to||''),window=String(input.window||'30');
 if(!VALID_GRAIN.has(grain))throw Error('Select a valid time breakdown.');
 if(!validDate(from)||!validDate(to))throw Error('Enter valid start and end dates.');
 if(!['7','30','lifetime'].includes(window))throw Error('Choose a 7-day, 30-day or lifetime conversion window.');
 const fromDay=dateUtc(from),toDay=dateUtc(to),max=(toDay-fromDay)/DAY;
 if(max<0||max>3652)throw Error('Choose a date range of up to ten years.');
 const min=fromDay-IST_MS,maxExclusive=toDay-IST_MS+DAY;
 const labels=new Set();for(let day=fromDay;day<=toDay;day+=DAY){labels.add(bucket(day-IST_MS,grain));if(labels.size>125)throw Error('Choose a shorter range (maximum 125 chart periods).');}
 return {grain,from,to,window,min,maxExclusive,labels:[...labels]};
}
export function bucket(ts,grain){
 const d=new Date(ts+IST_MS),year=d.getUTCFullYear(),month=String(d.getUTCMonth()+1).padStart(2,'0'),day=String(d.getUTCDate()).padStart(2,'0');
 if(grain==='year')return String(year);
 if(grain==='month')return `${year}-${month}`;
 if(grain==='day')return `${year}-${month}-${day}`;
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 return d.toISOString().slice(0,10);
}
const time=x=>{const v=Number(x);return Number.isFinite(v)&&v>0?v:0;};
const inRange=(t,p)=>t>=p.min&&t<p.maxExclusive;
const unique=(set,value)=>{if(value)set.add(value);};
export function summarizeCareerAnalytics({sessions=[],payments=[],complimentary=[]},params,at=Date.now()){
 const p=validateAnalyticsParams(params);const series=p.labels.map(label=>({period:label,free:0,premiumPaid:0,buddyPaid:0,premiumComplimentary:0,buddyComplimentary:0,refillsPaid:0,revenueInr:0}));
 const rows=new Map(series.map(x=>[x.period,x]));const freeSet=new Set(),premiumSet=new Set(),buddySet=new Set(),reportSet=new Set(),coachSet=new Set();
 const premiumFree=new Set(),buddyFree=new Set(),anyFree=new Set(),promoPremium=new Set(),promoBuddy=new Set();
 const paidBySession=new Map();
 const normalized=[];
 for(const pay of payments){
  if(!pay?.sessionId||!PACKS.has(pay.packId)||pay.granted!==true||pay.status!=='captured'||!(Number(pay.amountPaise)>0))continue;
  const timestamp=time(pay.grantedAt);if(!timestamp)continue;
  normalized.push({id:pay.id,sessionId:pay.sessionId,packId:pay.packId,at:timestamp,kind:'paid',amountPaise:Number(pay.amountPaise)});
 }
 for(const freebie of complimentary){
  if(!freebie?.sessionId||!PACKS.has(freebie.packId)||Number(freebie.priceInr)!==0)continue;
  const timestamp=time(freebie.at);if(!timestamp)continue;
  normalized.push({id:freebie.id,sessionId:freebie.sessionId,packId:freebie.packId,at:timestamp,kind:'complimentary',amountPaise:0});
 }
 const eventKeys=new Set();const premiumPaidByBucket=new Map(),buddyPaidByBucket=new Map();
 const premiumPromoByBucket=new Map(),buddyPromoByBucket=new Map();
 const refundsNote='Gross verified captured receipts before refunds. No payment attempts, simulated checkouts or complimentary grants are included.';
 for(const event of normalized){
  const key=event.id||`${event.kind}|${event.sessionId}|${event.packId}|${event.at}`;
  if(eventKeys.has(key))continue;eventKeys.add(key);
  if(event.kind==='paid'&&['starter','intro'].includes(event.packId)){
   if(!paidBySession.has(event.sessionId))paidBySession.set(event.sessionId,[]);
   paidBySession.get(event.sessionId).push(event);
  }
  if(!inRange(event.at,p))continue;
  const b=bucket(event.at,p.grain),row=rows.get(b);if(!row)continue;
  const isStarter=event.packId==='starter',isIntro=event.packId==='intro',isRefill=!isStarter&&!isIntro;
  if(event.kind==='paid'){
   row.revenueInr+=event.amountPaise/100;
   if(isRefill)row.refillsPaid++;
   const map=isStarter?premiumPaidByBucket:buddyPaidByBucket;
   if(!isRefill){if(!map.has(b))map.set(b,new Set());map.get(b).add(event.sessionId);unique(isStarter?premiumSet:buddySet,event.sessionId);}
  }else if(isStarter||isIntro){
   const map=isStarter?premiumPromoByBucket:buddyPromoByBucket;if(!map.has(b))map.set(b,new Set());map.get(b).add(event.sessionId);
   unique(isStarter?promoPremium:promoBuddy,event.sessionId);
  }
 }
 for(const row of series){
  row.premiumPaid=premiumPaidByBucket.get(row.period)?.size||0;row.buddyPaid=buddyPaidByBucket.get(row.period)?.size||0;
  row.premiumComplimentary=premiumPromoByBucket.get(row.period)?.size||0;row.buddyComplimentary=buddyPromoByBucket.get(row.period)?.size||0;
  row.revenueInr=Number(row.revenueInr.toFixed(2));
 }
 const freeByBucket=new Map();let pendingCohorts=0;
 for(const s of sessions){
  const id=s.id||s.sessionId;if(!id)continue;
  const freeAt=time(s.freeReportAt),reportAt=time(s.reportGeneratedAt);
  if(reportAt&&inRange(reportAt,p))reportSet.add(id);
  const messages=Array.isArray(s.messages)?s.messages:[];
  if(messages.some(m=>m?.role==='assistant'&&time(m.at)&&inRange(time(m.at),p))||(time(s.lastCoachReplyAt)&&inRange(time(s.lastCoachReplyAt),p)))coachSet.add(id);
  if(!freeAt||!inRange(freeAt,p))continue;
  unique(freeSet,id);
  const b=bucket(freeAt,p.grain);if(!freeByBucket.has(b))freeByBucket.set(b,new Set());freeByBucket.get(b).add(id);
  const deadline=p.window==='lifetime'?Infinity:freeAt+Number(p.window)*DAY;
  if(at<deadline)pendingCohorts++;
  const buys=(paidBySession.get(id)||[]).filter(x=>x.at>=freeAt&&x.at<=deadline);
  const gotPremium=buys.some(x=>x.packId==='starter'),gotBuddy=buys.some(x=>x.packId==='intro');
  if(gotPremium)premiumFree.add(id);
  if(gotBuddy)buddyFree.add(id);
  if(gotPremium||gotBuddy)anyFree.add(id);
 }
 for(const row of series)row.free=freeByBucket.get(row.period)?.size||0;
 const pct=(n,d)=>d?Number((100*n/d).toFixed(1)):0;
 const total=freeSet.size;
 return {range:{grain:p.grain,from:p.from,to:p.to,timezone:'Asia/Kolkata',conversionWindow:p.window,generatedAt:at,provisional:pendingCohorts>0||p.window==='lifetime',unmaturedCohortUsers:pendingCohorts},
  summary:{freeCompleted:total,premiumBuyers:premiumSet.size,buddyBuyers:buddySet.size,premiumCouponUsers:promoPremium.size,buddyCouponUsers:promoBuddy.size,premiumReportsCompleted:reportSet.size,coachingActiveUsers:coachSet.size,
   paidFromFreePremium:premiumFree.size,paidFromFreeBuddy:buddyFree.size,paidFromFreeAny:anyFree.size,freeToPremiumPct:pct(premiumFree.size,total),freeToBuddyPct:pct(buddyFree.size,total),freeToAnyPct:pct(anyFree.size,total),
   refillPurchases:series.reduce((n,row)=>n+row.refillsPaid,0),grossReceiptsInr:Number(series.reduce((n,row)=>n+row.revenueInr,0).toFixed(2))},series,
  notes:[refundsNote,'Premium includes Career Buddy credits but is not counted as a standalone Buddy purchase.','Conversion rates use Free Snapshot cohorts from the selected range and only captured, paid starter/intro purchases in the selected conversion window.','Historical coaching usage may be incomplete if earlier chat messages have been truncated.','Production-only records are counted; tests and checkout attempts are excluded.']};
}
