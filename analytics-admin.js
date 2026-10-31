/* Owner analytics: only aggregated server responses are rendered; no private sessions sent to the browser. */
(() => {
 const $=id=>document.getElementById(id);
 let grain='month',last=null;
 const number=n=>Number(n||0).toLocaleString('en-IN');
 const currency=n=>'₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2});
 const nowIst=()=>new Date(Date.now()+330*60000).toISOString().slice(0,10);
 const date=(y,m,d)=>new Date(Date.UTC(y,m,d)).toISOString().slice(0,10);
 function defaultDates(g){
  const today=nowIst(),[y,m,d]=today.split('-').map(Number);$('toDate').value=today;
  $('fromDate').value=g==='day'?date(y,m-1,d-29):g==='week'?date(y,m-1,d-83):g==='month'?date(y,m-12,1):date(y-4,0,1);
 }
 function selectGrain(g){grain=g;document.querySelectorAll('[data-grain]').forEach(b=>{b.classList.toggle('selected',b.dataset.grain===g);b.setAttribute('aria-pressed',String(b.dataset.grain===g));});defaultDates(g);if(!($('adminContent').hidden))refresh();}
 const elem=(tag,txt,cls)=>{const el=document.createElement(tag);if(txt!==undefined)el.textContent=txt;if(cls)el.className=cls;return el;};
 const rowLabel=g=>g==='week'?'Week of ':'';
 function card(label,value){const c=elem('div',undefined,'analytic-kpi');c.append(elem('strong',value),elem('span',label));return c;}
 function render(data){
  last=data;const s=data.summary||{},rng=data.range||{},series=data.series||[];
  $('analysisPeriod').textContent=`Showing ${rng.from} to ${rng.to} · ${rng.timezone} · ${rng.grain} breakdown · conversion window: ${rng.conversionWindow==='lifetime'?'lifetime':rng.conversionWindow+' days'}`;
  $('kpiCards').replaceChildren(
   card('Completed free snapshots',number(s.freeCompleted)),card('Premium paying customers',number(s.premiumBuyers)),card('Standalone Buddy paying customers',number(s.buddyBuyers)),
   card('Premium reports completed',number(s.premiumReportsCompleted)),card('Coaching active users',number(s.coachingActiveUsers)),card('Paid coaching refills',number(s.refillPurchases)),
   card('Premium complimentary activations',number(s.premiumCouponUsers)),card('Buddy complimentary activations',number(s.buddyCouponUsers)),card('Gross verified receipts (before refunds)',currency(s.grossReceiptsInr)));
  const bars=$('conversionBars');bars.replaceChildren();
  for(const [label,key,users] of [['Free → Premium','freeToPremiumPct','paidFromFreePremium'],['Free → Buddy Intro','freeToBuddyPct','paidFromFreeBuddy'],['Free → Any paid product','freeToAnyPct','paidFromFreeAny']]){
   const group=elem('div',undefined,'conversion-row'),head=elem('div',undefined,'labels'),meter=elem('div',undefined,'conversion-meter');
   head.append(elem('span',label),elem('span',`${Number(s[key]||0).toFixed(1)}% · ${number(s[users])}/${number(s.freeCompleted)}`));
   const fill=elem('span');fill.style.width=Math.min(100,Number(s[key]||0))+'%';meter.append(fill);group.append(head,meter);bars.append(group);
  }
  $('cohortNotice').textContent=rng.conversionWindow==='lifetime'?'Lifetime conversions can continue to increase as people purchase later.':rng.provisional?`${number(rng.unmaturedCohortUsers)} selected Free Snapshot cohort(s) have not yet completed the ${rng.conversionWindow}-day observation window. Conversion rates are provisional.`:'All selected Free Snapshot cohorts have completed their observation window.';
  const chart=$('trendChart');chart.replaceChildren();const max=Math.max(1,...series.flatMap(row=>[row.free,row.premiumPaid,row.buddyPaid]));
  for(const r of series){const group=elem('div',undefined,'trend-row'),label=elem('strong',rowLabel(grain)+r.period),b=elem('div',undefined,'trend-bars');
   for(const [key,cls] of [['free','free'],['premiumPaid','premium'],['buddyPaid','buddy']]){const bar=elem('div',undefined,'trend-bar '+cls);bar.style.width=(100*Number(r[key]||0)/max)+'%';bar.setAttribute('title',`${key}: ${number(r[key])}`);b.append(bar);}
   group.append(label,b);chart.append(group);
  }
  const tbody=$('analyticsRows');tbody.replaceChildren();for(const r of series){const tr=elem('tr');for(const col of [r.period,number(r.free),number(r.premiumPaid),number(r.buddyPaid),number(r.premiumComplimentary),number(r.buddyComplimentary),number(r.refillsPaid),currency(r.revenueInr)])tr.append(elem('td',col));tbody.append(tr);}
  const notes=$('analyticsNotes');notes.replaceChildren();for(const note of data.notes||[])notes.append(elem('li',note));
  $('adminStatus').textContent='Business analytics loaded. Updated '+new Date(rng.generatedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST.';
 }
 async function refresh(){
  $('applyFilters').disabled=true;$('adminStatus').textContent='Calculating verified activity and conversion metrics…';
  const args=new URLSearchParams({action:'analyticsSummary',grain,from:$('fromDate').value,to:$('toDate').value,window:$('conversionWindow').value});
  try{const res=await fetch('/api/service?'+args,{credentials:'same-origin'});const json=await res.json().catch(()=>({}));if(!res.ok)throw Error(json.error||`Request failed (${res.status}).`);render(json);}
  catch(e){$('adminStatus').textContent='Unable to load analytics: '+e.message;}
  finally{$('applyFilters').disabled=false;}
 }
 function exportCsv(){if(!last)return;const cols=['period','free','premiumPaid','buddyPaid','premiumComplimentary','buddyComplimentary','refillsPaid','revenueInr'];
  const content=[cols.join(','),...(last.series||[]).map(x=>cols.map(k=>String(x[k]??'')).join(','))].join('\r\n');const b=new Blob(['\ufeff',content],{type:'text/csv;charset=utf-8'}),link=document.createElement('a');link.href=URL.createObjectURL(b);link.download='career-buddy-analytics-'+grain+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),0);
 }
 document.querySelectorAll('[data-grain]').forEach(btn=>btn.addEventListener('click',()=>selectGrain(btn.dataset.grain)));
 $('applyFilters').addEventListener('click',refresh);$('exportAnalytics').addEventListener('click',exportCsv);
 defaultDates(grain);window.BuddyAdminAuth.bootstrap(async()=>{$('adminContent').hidden=false;await refresh();});
})();
