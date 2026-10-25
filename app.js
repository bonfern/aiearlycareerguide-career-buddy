/* Career Buddy V5.7: assessment-first entry, contextual coaching and accessible scroll management. */
const $=id=>document.getElementById(id);
const APP_BASE=window.location.pathname.startsWith('/professionals/') || window.location.pathname==='/professionals' ? '/professionals' : '';
const servicePath=()=>`${APP_BASE}/api/service`;

const screens=['Choose','Login','Free','Snapshot','Upgrade','Resume','Paid','Toolkit','CoachOffer','Coach','Refills','Reports'];
let state=null,configured=false,privatePreview=true,flow='free',current='Choose',loading=false,reportKind='free',preparationError='';
const uuid=()=>crypto.randomUUID();
const money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
async function api(action,data){const r=await fetch(`${servicePath()}?action=${encodeURIComponent(action)}`,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});let out={};try{out=await r.json();}catch{}if(!r.ok)throw Error(out.error||`Request failed (${r.status})`);return out;}
// Prevent browsers from restoring an old vertical position when a stage is replaced.
try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch{}
let navigationSequence=0;
function toPageStart(stage=current,{focusHeading=true}={}){
 const sequence=++navigationSequence;
 const reset=()=>{
  if(current!==stage||sequence!==navigationSequence)return;
  const scroller=document.scrollingElement||document.documentElement;
  if(scroller)scroller.scrollTop=0;
  document.body.scrollTop=0;
  window.scrollTo(0,0);
 };
 reset();
 // The first scroll happens before DOM reflow. Repeat after repaint so mobile
 // virtual keyboards, removed answer fields and focused buttons cannot pull us down.
 requestAnimationFrame(()=>{
  if(current!==stage||sequence!==navigationSequence)return;
  if(focusHeading){const h=$('screen'+stage)?.querySelector('.question-shell h2, h1, h2');
   if(h){h.tabIndex=-1;try{h.focus({preventScroll:true});}catch{}}}
  reset();
 });
}
function notice(text='',isError=false){$('notice').textContent=text;$('notice').className=text?`notice${isError?' error':''}`:'notice hidden';}
function show(screen){
 if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
 current=screen;for(const name of screens)$('screen'+name).classList.toggle('hidden',name!==screen);
 $('topnav').classList.toggle('hidden',!state);$('coachNavButton').classList.toggle('hidden',!state?.freeReport&&!state?.reportGenerated);
 $('testerTools').classList.toggle('hidden',!state||state.mode==='private-live');$('signedEmail').textContent=state?.email?`Verified as ${state.email}`:'';
 toPageStart(screen);
}
function setFlow(next){flow=next;try{sessionStorage.setItem('buddy-v53-intent',next);}catch{}}
function isAssessmentPaid(){return state?.tier==='paid';}
function isCoachActive(){return Boolean(state?.freeReport||state?.reportGenerated)&&(state?.tier==='paid'||state?.tier==='coach');}
function goAssessment(){if(!state){show('Login');return;}if(!state.freeReport){show('Free');$('freeIntroNote').textContent=flow==='premium'?'Seven focused questions create your free career snapshot.':'These brief questions create your free career snapshot.';}else if(isAssessmentPaid())show(state.reportGenerated?'Toolkit':state.resumeDecision?'Paid':'Resume');else if(flow==='premium')show('Upgrade');else show('Snapshot');paint();}
function goCoach(){if(!state){show('Login');return;}if(!state.freeReport&&!state.reportGenerated){notice('Complete your free career discovery and snapshot first to activate Career Buddy.');show('Free');paint();return;}if(isCoachActive())show('Coach');else show('CoachOffer');paint();}
async function choose(next){setFlow(next);if(!state){show('Login');return;}await run(async()=>{state=(await api('setJourney',{journey:next})).state;notice('');goAssessment();});}
function paint(){if(!state)return;const s=current;
 if(s==='Free')paintQuestion(true);
 if(s==='Paid')paintPaidAssessment();
 if(s==='Snapshot')paintSnapshot();
 if(s==='Resume')paintResume();
 if(s==='Toolkit')paintToolkit();
 if(s==='Coach')paintCoach();
 if(s==='Refills')$('refillBalance').textContent=`${state.credits||0} interactions remaining · Valid until ${new Date(state.expiresAt).toLocaleDateString('en-IN')}`;
 if(s==='Reports')paintReports();
 syncPaymentLabels();
}
// A new stage is sometimes painted *inside* an async action. Its controls must be
// unlocked only after the async action finishes, not left disabled forever.
function syncBusyControls(){
 for(const b of document.querySelectorAll('[data-async-action="1"]')) b.disabled=loading||(b.dataset.requiresFreeReady==='1'&&!state?.freeReportReady);
 if(current==='Coach'&&state){
  const blocked=loading||Number(state.credits||0)<=0||Boolean(state.expired);
  $('chatInput').disabled=blocked;$('chatSend').disabled=blocked;
 }
}
async function run(work){
 if(loading)return;
 loading=true;syncBusyControls();
 try{await work();}
 catch(e){if(current==='Paid'){preparationError=e.message;paintPaidAssessment();}notice(e.message,true);}
 finally{loading=false;syncBusyControls();}
}
function addList(root,heading,items){
 root.append(el('h3','',heading));const ul=el('ul');
 for(const item of items||[]){
  const li=el('li','');
  if(typeof item==='string')li.textContent=item;
  else if(item&&typeof item==='object'&&Array.isArray(item.bullets)){
   li.append(el('strong','',item.title||item.name||'Career recommendation'));
   const inner=el('ul','snapshot-bullets');for(const detail of item.bullets)inner.append(el('li','',detail));li.append(inner);
  }else li.textContent=String(item?.title||'');
  ul.append(li);
 }
 root.append(ul);
}
// The paid experience is an independently graded 12–15 question assessment.
// Private answer keys and correctness never appear in browser state.
function paintPaidAssessment(){
 const host=$('paidQuestion'),a=state?.assessment||{},answered=a.answered||0,total=a.total||0;
 $('paidProgress').style.width=`${total?Math.round(answered/total*100):0}%`;
 $('paidCounter').textContent=total?`${answered} of ${total} scenario questions completed`:(a.preparationStep?`Question preparation ${a.preparationStep} of 3 complete`:'Questions not prepared yet');
 host.replaceChildren();
 if(!state.resumeDecision){host.append(el('h2','','Your optional resume step comes first.'));
  const b=el('button','primary','Continue to resume step →');b.onclick=()=>show('Resume');host.append(b);return;}
 if(!a.started){
  host.append(el('h2','','Assess your most important role skills'),el('p','muted','You will answer 12–15 realistic multiple-choice questions covering 4–5 essential technical and soft skills. Three questions will test each skill. No typing or self-rating required.'));
  host.append(el('p','micro','Questions are tailored to your target role. Preparation has three short stages; successfully completed stages are saved.'));
  if(a.preparationStep){host.append(el('p','muted',`${a.preparationStep} of 3 preparation stages complete. Your previous results are saved.`));}
  if(preparationError){host.append(el('p','question-error',preparationError));}
  const b=el('button','primary',a.preparationStep?'Retry / resume preparation →':'Prepare my competency assessment →');b.dataset.asyncAction='1';b.disabled=loading;b.onclick=prepareAssessment;host.append(b);return;
 }
 if(a.finished){
  host.append(el('h2','','Your competency assessment is complete.'),el('p','muted',`You answered ${total} scenario questions across ${a.competencies.length} essential skills. The report will use your answers to identify priorities, along with your free discovery profile and optional resume.`));
  const b=el('button','primary','Generate my detailed career report →');b.dataset.asyncAction='1';b.disabled=loading;b.onclick=generateDetailed;host.append(b);return;
 }
 const q=a.question;if(!q)return;
 host.append(el('p','eyebrow',`${q.competency} · ${q.kind==='knowledge'?'Applied knowledge':'Workplace scenario'}`));
 host.append(el('h2','',q.text),el('p','micro','Select the BEST response. Choose “Not sure” if you do not know.'));
 const group=el('div','answers'),inputs=[];
 for(let i=0;i<q.options.length;i++){
  const row=el('label','answer'),input=el('input');input.type='radio';input.name='assessmentAnswer';input.value=i;
  row.append(input,el('span','',q.options[i]));group.append(row);inputs.push(input);
 }
 host.append(group);
 const error=el('div','question-error'),actions=el('div','question-actions');
 const b=el('button','primary','Save answer and continue →');b.dataset.asyncAction='1';b.disabled=loading;
 b.onclick=()=>{const pick=inputs.find(x=>x.checked);if(!pick){error.textContent='Select one option to continue.';return;}answerPaid(q.id,Number(pick.value));};
 actions.append(el('span','micro',`Question ${q.number} of ${q.total} · No credit deducted for assessment answers`),b);host.append(actions,error);
}
async function prepareAssessment(){await run(async()=>{
 preparationError='';
 // Each call generates at most one stage, avoiding long serverless timeouts.
 // If interrupted, the server persists the completed stages for resumption.
 for(let step=0;step<3;step++){
  if(state?.assessment?.started)break;
  const progress=Number(state?.assessment?.preparationStep||0);
  notice(`Preparing questions: stage ${Math.min(progress+1,3)} of 3…`);
  const response=await api('assessmentStart',{requestId:uuid()});
  state=response.state;
  paintPaidAssessment();
  if(state.assessment?.started)break;
 }
 if(!state?.assessment?.started)throw Error('Preparation is paused. Select Retry / resume preparation to continue.');
 notice('');paintPaidAssessment();toPageStart('Paid');
});}
async function answerPaid(questionId,choice){await run(async()=>{
 state=(await api('assessmentAnswer',{requestId:uuid(),questionId,choice})).state;
 notice('');paintPaidAssessment();toPageStart('Paid');
});}
function paintQuestion(free){const name=free?'free':'paid',host=$(name+'Question'),guided=state.guided||{},q=guided.question;
 const progress=(guided.completed||0)/(guided.total||10);$(name+'Progress').style.width=`${Math.round(100*progress)}%`;$(name+'Counter').textContent=`${guided.completed||0} of ${guided.total||10} topics completed`;
 host.replaceChildren();if(!free&&(!state.resumeDecision)){host.append(el('p','','Your optional resume decision comes first.'));const b=el('button','primary','Continue to resume step');b.onclick=()=>show('Resume');host.append(b);return;}
 if(!q){const ready=free?state.freeReportReady:state.reportReady;host.append(el('h2','',free?'Your free screening is complete.':ready?'Your detailed report is ready to generate.':'A little more context is needed.'));
  host.append(el('p','muted',free?(state.freeReportReady?'Create your concise snapshot. You can download it now or at any time in My reports.':'A required area is incomplete. Please review the missing details before requesting a snapshot.'):ready?'Your initial detailed report is included and does not cost a chat interaction.':'You can use paid coaching to provide additional examples and clarify any missing areas.'));
  if(!ready){const missing=free?(state.freeReadiness?.missing||[]):(state.readiness?.missing||[]);if(missing.length)addList(host,'Information still needed',missing);}
  const button=el('button','primary',free?'Generate free snapshot →':ready?'Generate detailed report →':'Ask Career Buddy for guidance →');button.dataset.asyncAction='1';if(free)button.dataset.requiresFreeReady='1';button.onclick=()=>free?generateFree():ready?generateDetailed():goCoach();button.disabled=loading||(free&&!state.freeReportReady);host.append(button);return;}
 host.append(el('h2','',q.text));
 const choices=el('div','answers'),inputs=[];
 const multiLimit=q.kind==='multi'?(q.maxSelections||4):null;
 const selectedCount=q.kind==='multi'?el('p','micro',`Select up to ${multiLimit} · 0 of ${multiLimit} selected`):null;
 if(selectedCount)host.append(selectedCount);
 if(q.kind!=='text'){
  for(const op of q.options||[]){const row=el('label','answer');const input=document.createElement('input');input.type=q.kind==='multi'?'checkbox':'radio';input.name='answerOption';input.value=op;row.append(input,el('span','',op));choices.append(row);inputs.push(input);}
  host.append(choices);
 }
 let txt=null,other=null;
 if(q.kind==='text'){txt=el('textarea');txt.id='answerText';txt.maxLength=q.maxLength||300;txt.placeholder=q.placeholder||'A short answer is enough';txt.rows=3;host.append(txt,el('div','help-text',q.example?'A concrete work example is enough; numerical results are not required.':`Up to ${txt.maxLength} characters.`));}
 else {other=el('input');other.type='text';other.maxLength=120;other.placeholder='Please specify briefly';other.className='hidden';host.append(other);for(const input of inputs)input.onchange=()=>{
  if(q.kind==='multi'&&input.checked){
   if(input.value==='No hands-on experience yet'){inputs.forEach(x=>{if(x!==input)x.checked=false;});}
   else{const none=inputs.find(x=>x.value==='No hands-on experience yet');if(none)none.checked=false;}
   if(inputs.filter(x=>x.checked).length>multiLimit){input.checked=false;error.textContent=`Select up to ${multiLimit} options.`;}
   else error.textContent='';
  }
  if(selectedCount)selectedCount.textContent=`Select up to ${multiLimit} · ${inputs.filter(x=>x.checked).length} of ${multiLimit} selected`;
  other.classList.toggle('hidden',!inputs.some(x=>x.checked&&x.value==='Other'));
 };}
 const row=el('div','question-actions'),error=el('div','question-error');
 if(q.optional){const skip=el('button','secondary','Skip');skip.onclick=()=>sendQuick(q,true);row.append(skip);}else row.append(el('span','micro','Your answer is saved automatically.'));
 const submit=el('button','primary','Continue →');submit.onclick=()=>{let value=q.kind==='text'?txt.value.trim():q.kind==='multi'?inputs.filter(x=>x.checked).map(x=>x.value):(inputs.find(x=>x.checked)?.value||'');if(!value||Array.isArray(value)&&!value.length){error.textContent='Choose an answer to continue.';return;}if(q.kind==='multi'&&value.length>(q.maxSelections||4)){error.textContent=`Select up to ${q.maxSelections||4} options.`;return;}if(q.kind==='multi'&&value.length<(q.minSelections||1)){error.textContent=`Choose at least ${q.minSelections||1} options.`;return;}sendQuick(q,false,value,other?.value?.trim()||'');};row.append(submit);host.append(row,error);
}
async function sendQuick(q,skip,value,other=''){await run(async()=>{const v=await api('quick',{questionId:q.id,skip,value,other,requestId:uuid()});state=v.state;notice('');paint();toPageStart(current);});}
function paintSnapshot(){const r=state.freeReport||{},view=$('snapshotSummary');view.replaceChildren();if(!state.freeReport){view.append(el('p','','Finish the free assessment first.'));return;}view.append(el('h3','','Your professional profile'),el('p','',r.profileSummary||''));addList(view,'Skills your target role needs',(r.targetCompetencies||[]));addList(view,'Five practical next steps',(r.nextSteps||[]));addList(view,'What we need to check next',(r.furtherAssessment||[]));if((r.version||0)<4){const b=el('button','secondary','Refresh snapshot with clearer guidance →');b.onclick=generateFree;view.append(b);}}
function paintResume(){const box=$('resumePaste');box.value=state?.resumeDecision==='provided'?'':box.value||'';$('resumeCount').textContent=`${box.value.length.toLocaleString()} / 12,000 characters`;}
function paintToolkit(){const provided=state.resumeSubmitted,revised=!!state.resumeRevision;$('resumeKitText').textContent=revised?'Your revised resume is ready. Review the facts before using it.':provided?'Your pasted resume can now be revised into an editable Word document and PDF.':'Resume review is optional. You can paste one later without repeating the detailed assessment.';$('buildResume').classList.toggle('hidden',!provided||revised);$('resumeDownloadRow').classList.toggle('hidden',!revised);$('resumeLater').classList.toggle('hidden',provided);$('remainingNote').textContent=`${state.credits||0} interactions remaining. Your reports will stay in My reports.`;}
// These are drafted locally from THIS USER'S saved career data. They consume no
// tokens and are never stored in the shared role-guidance cache.
function coachOpeningQuestions(s){
 const p=s?.profile||{};
 const short=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,85).replace(/[.!?]+$/,'');
 const target=short(p.targetRole);
 const exploring=!target||/^(?:still exploring|not sure|unsure|undecided|exploring)$/i.test(target);
 const role=exploring?'your next career direction':target;
 const focus=Array.isArray(p.gaps)?short(p.gaps.find(x=>x&&!/not sure/i.test(x))):'';
 const practised=Array.isArray(p.roleExperience)?short(p.roleExperience.find(x=>x&&!/no hands-on experience/i.test(x))):'';
 const currentRole=short(p.currentRole);
 const hasReport=!!s?.reportGenerated;
 const first=hasReport?
  (focus?`What is one practical way to improve ${focus} for ${role}?`:`What should I do first from my 30/60/90-day plan for ${role}?`):
  (exploring?`Based on my ${currentRole||'work'} experience, which three roles should I explore?`:
   focus?`How can I develop ${focus} to prepare for ${role}?`:
   `What should I do first to prepare for ${role}?`);
 return [
  {label:focus?`Build ${focus}`:'My next practical step',question:first},
  {label:'Prepare for interviews',question:exploring?'How should I prepare for interviews while exploring new career options?':`What interview questions should I practise for ${role}?`},
  {label:practised?'Show my experience':'Skills to build',question:practised?`How can I show my experience in ${practised} when applying for ${role}?`:`Which skills should I build first for ${role}?`},
  {label:'Create a 30-day plan',question:exploring?'What can I do over the next 30 days to choose a suitable career direction?':`Give me three practical actions for the next 30 days towards ${role}.`}
 ];
}
function paintCoachPrompts(){
 const items=coachOpeningQuestions(state);
 const p=state?.profile||{};
 const target=String(p.targetRole||'').trim();
 $('coachContextNote').textContent=target&&!/^(?:still exploring|not sure|unsure|exploring)$/i.test(target)
  ?`Based on your saved assessment: ${target.slice(0,85)}.`
  :'Based on your saved career discovery answers.';
 for(const [i,b] of document.querySelectorAll('[data-coach-prompt]').entries()){
  const suggestion=items[i];if(!suggestion)continue;
  b.dataset.coachPrompt=suggestion.question;
  b.replaceChildren(document.createTextNode(suggestion.label+' '),el('span','','↗'));
 }
}
function paintCoach(){
 const rem=Number(state.credits||0);
 $('coachCreditPill').textContent=`${rem} interaction${rem===1?'':'s'} left · Refill`;
 const warn=state.warning||((rem<=0)?'Your coaching credits are exhausted. Refill to continue; previous messages remain visible.':state.expired?'Your pack has expired. Refill to continue; previous messages remain visible.':'');
 $('creditWarning').classList.toggle('hidden',rem>10&&!state.expired&&!warn.trim());
 $('creditWarning').textContent=warn;
 paintCoachPrompts();
 const msgs=state.messages||[];
 const hasConversation=msgs.some(m=>m.role==='user');
 $('coachPrompts').classList.toggle('hidden',hasConversation);
 const pane=$('chatMessages');pane.classList.toggle('hidden',!hasConversation);pane.replaceChildren();
 if(hasConversation){
  // Hide the generic account-welcome notification; keep actual coaching turns.
  for(const m of msgs.filter(m=>m.at||m.role==='user')){
   const row=el('div',`message ${m.role==='user'?'user':'assistant'}`);
   row.append(el('small','',m.role==='user'?'YOU':'CAREER BUDDY'),el('span','',m.content));pane.append(row);
  }
  pane.scrollTop=pane.scrollHeight;
 }
 syncBusyControls();
}
function paintReports(){const host=$('reportsList');host.replaceChildren();function item(title,desc,buttons){const card=el('div','report-item');card.append(el('h2','',title),el('p','',desc));for(const [label,fn] of buttons){const b=el('button','secondary',label);b.onclick=fn;card.append(b);}host.append(card);}
 if(state.freeReport)item('Free Career Snapshot','Your saved preliminary four-section assessment.',[['View',()=>openFree()],['Download PDF',()=>download('free','pdf')],...((state.freeReport.version||0)<4?[['Refresh guidance',()=>generateFree()]]:[])]);
 if(state.reportGenerated)item('Detailed Career Report','Role expectations, technical and behavioural skills, evidence-based development actions, 30/60/90 plan and 10 interview questions.',[['View',()=>openDetailed()],['Download PDF',()=>download('report','pdf')]]);
 if(state.resumeRevision)item('Revised Resume','Review the editable draft and confirm all facts before applying.',[['View',()=>openResume()],['Download Word',()=>download('resume','docx')],['Download PDF',()=>download('resume','pdf')]]);
 if(state.freeReport){const b=el('button','secondary','Continue with Career Buddy →');b.onclick=goCoach;host.append(b);}
 if(!state.freeReport&&!state.reportGenerated&&!state.resumeRevision)host.append(el('p','muted','Your reports will appear here after you generate them.'));
}
async function generateFree(){await run(async()=>{notice('Generating your short free snapshot…');state=(await api('freeReport',{requestId:uuid()})).state;notice('Your free snapshot is saved and ready to download.');show('Snapshot');paint();});}
let razorpayLibraryPromise=null;
function loadRazorpayCheckout(){
 if(window.Razorpay)return Promise.resolve();
 if(razorpayLibraryPromise)return razorpayLibraryPromise;
 razorpayLibraryPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://checkout.razorpay.com/v1/checkout.js';
  script.onload=()=>window.Razorpay?resolve():reject(Error('Razorpay checkout could not be loaded.'));
  script.onerror=()=>reject(Error('Could not load the secure Razorpay checkout.'));
  document.head.append(script);
 });
 return razorpayLibraryPromise;
}
async function openTestCheckout(checkout){
 await loadRazorpayCheckout();
 return new Promise((resolve,reject)=>{
  const rzp=new window.Razorpay({
   key:checkout.keyId,amount:checkout.amountPaise,currency:'INR',order_id:checkout.orderId,
   name:checkout.name,description:checkout.description,prefill:{email:checkout.email},
   theme:{color:'#15294e'},
   handler:data=>resolve({orderId:data.razorpay_order_id,paymentId:data.razorpay_payment_id,signature:data.razorpay_signature}),
   modal:{ondismiss:()=>reject(Error('Checkout closed. No credits were added. You can check payment status before trying again.'))}
  });
  rzp.on('payment.failed',()=>{ /* Keep the checkout open for retry. No credits granted. */ });
  rzp.open();
 });
}
function afterPurchase(packId){
 if(packId==='starter'){setFlow('premium');show(state.reportGenerated?'Toolkit':state.resumeDecision?'Paid':'Resume');}
 else show('Coach');
 paint();
}
async function activate(packId,couponId){
 await run(async()=>{
  const couponCode=$(couponId)?.value?.trim()||'';
  if(state?.paymentMode==='razorpay_live'){
   notice('Checking your discount or preparing secure payment…');
   const result=await api('liveCheckout',{packId,couponCode,requestId:uuid()});
   if(result.kind==='complimentary'){state=result.state;notice(result.notice);afterPurchase(packId);}
   else{
    state.pendingLiveCheckout={orderId:result.checkout.orderId};syncPaymentLabels();
    notice(`Opening secure Razorpay checkout for ${money(result.checkout.amountPaise / 100)}. Confirm the amount before paying.`);
    const payment=await openTestCheckout(result.checkout);
    const verified=await api('livePaymentVerify',payment);
    state=verified.state;notice(verified.notice);afterPurchase(packId);
   }
  }else if(state?.paymentMode==='razorpay_test'){
   notice('Opening Razorpay Test Mode checkout. No real money will be charged.');
   const order=await api('testCheckout',{packId,couponCode,requestId:uuid()});
   state.pendingTestCheckout={orderId:order.checkout.orderId};syncPaymentLabels();
   const payment=await openTestCheckout(order.checkout);
   const verified=await api('testPaymentVerify',payment);
   state=verified.state;notice(verified.notice);afterPurchase(packId);
  }else{
   const out=await api('mockPurchase',{packId,couponCode,requestId:uuid()});
   state=out.state;notice(out.notice);afterPurchase(packId);
  }
 });
}
async function reconcileTestPayment(){
 await run(async()=>{
  const reply=await api(state?.paymentMode==='razorpay_live'?'livePaymentStatus':'testPaymentStatus',{});state=reply.state;notice(reply.notice);
  if(state?.tier==='paid'&&!state.resumeDecision)show('Resume');
  else if(state?.tier==='coach')show('Coach');
  paint();
 });
}
function syncPaymentLabels(){
 const test=state?.paymentMode==='razorpay_test',live=state?.paymentMode==='razorpay_live',external=test||live;
 for(const [id,text] of [['activateStarter',live?'Review discount & proceed →':test?'Pay using Razorpay TEST Mode →':'Preview starter →'],['activateIntro',live?'Review discount & proceed →':test?'Pay using Razorpay TEST Mode →':'Preview coaching →']]){
  const node=$(id);if(node)node.textContent=text;
 }
 const notice=$('paymentModeNote');if(notice)notice.textContent=live?'Live payment mode: the final payable amount appears before payment confirmation.':test?'Razorpay TEST MODE: simulated transactions with no real charges.':'Owner simulation mode: credits activate without a payment.';
 const recover=$('paymentRecovery');
 if(recover)recover.classList.toggle('hidden',!external||!(live?state?.pendingLiveCheckout:state?.pendingTestCheckout));
}
async function saveResume(skip){await run(async()=>{state=(await api('chooseResume',{skip,resumeText:skip?'':$('resumePaste').value})).state;notice(skip?'Resume skipped. You can return to it later.':'Resume saved securely for the detailed report.');if(state.reportGenerated)show('Toolkit');else show('Paid');paint();});}
async function generateDetailed(){await run(async()=>{notice('Generating your detailed career report and tailored interview questions…');state=(await api('report',{requestId:uuid()})).state;notice('Your report is saved. Unused coaching credits remain available.');show('Toolkit');paint();});}
async function buildResume(){await run(async()=>{notice('Creating an editable resume draft from your provided text…');state=(await api('generateResume',{requestId:uuid()})).state;notice('Resume ready. Review all details before using it.');show('Toolkit');paint();});}
async function submitChat(event){event.preventDefault();const input=$('chatInput'),message=input.value.trim();if(!message)return;await run(async()=>{if(message.length>1200)throw Error('Maximum 1,200 characters per message.');input.value='';$('chatCount').textContent='0 / 1,200 characters';const req=api('chat',{message,requestId:uuid()}); // Allow the user to see a waiting indicator without inventing a charged response.
 $('chatMessages').append(el('div','message','Career Buddy is thinking…'));try{state=(await req).state;notice('');paintCoach();}catch(e){input.value=message;paintCoach();throw e;}
 });}
function download(kind,format='pdf'){window.location.assign(`${servicePath()}?action=download&kind=${encodeURIComponent(kind)}&format=${encodeURIComponent(format)}`);}
function openDialog(title){$('dialogTitle').textContent=title;$('reportContent').replaceChildren();$('reportDialog').showModal();$('reportDialog').scrollTop=0;$('reportContent').scrollTop=0;return $('reportContent');}
function openFree(){if(!state.freeReport)return;reportKind='free';const r=state.freeReport,host=openDialog('Your Free Career Snapshot');host.append(el('h3','','1. Your professional profile'),el('p','',r.profileSummary||''));addList(host,'2. Skills your target role needs',r.targetCompetencies);addList(host,'3. Five practical next steps',r.nextSteps);addList(host,'4. What we should check next',r.furtherAssessment);if((r.version||0)<4)host.append(el('p','micro','You can refresh this snapshot for simpler, more practical guidance.'));}
function openDetailed(){if(!state.report)return;reportKind='report';const r=state.report,host=openDialog('Career Action & Skill Development Report');host.append(el('h3','','Your career objective'),el('p','',r.goalPath?.headline||''),el('h3','','Career summary'),el('p','',r.summary||''));
 for(const [title,items] of [['Technical capability priorities',r.capabilityFocus?.technical],['Leadership and soft-skill priorities',r.capabilityFocus?.behavioural]]){host.append(el('h3','',title));for(const x of items||[])host.append(el('h4','',x.name),el('p','',`${x.currentCompetency} | ${x.priority}. ${x.firstAction}`));}
 host.append(el('h3','','Career actions'));for(const a of r.goalPath?.careerActions||[])host.append(el('h4','',a.title),el('p','',a.action),el('p','',`Expected outcome: ${a.outcome}`));
 host.append(el('h3','','Skill-by-skill plan'));for(const x of r.skillAssessments||[]){host.append(el('h4','',x.name),el('p','',`Role expectation: ${x.targetBenchmark}`),el('p','',`Available evidence: ${x.currentCompetency}`),el('p','',`Development focus: ${x.gap}`));addList(host,'Action steps',x.actions);host.append(el('p','',`Evidence task: ${x.practiceTask}`),el('p','',`Improvement indicator: ${x.successIndicator}`));}
 host.append(el('h3','','Other capabilities requiring assessment'));for(const x of r.additionalSkills||[])host.append(el('h4','',x.name),el('p','',x.expectation),el('p','',`Build: ${x.nextStep} · Verify: ${x.howToVerify}`));
 host.append(el('h3','','30 / 60 / 90-day execution plan'));for(const x of r.actionPlan||[])addList(host,`${x.period}: ${x.focus}`,x.actions);
 host.append(el('h3','','Progress and evidence checklist'));for(const x of r.progressChecklist||[])host.append(el('p','',`${x.skill}: ${x.deliverable} · ${x.evidence}`));
 addList(host,'Learning and professional development',[...(r.learningGuidance?.free||[]),...(r.learningGuidance?.paid||[]),...(r.learningGuidance?.certifications||[])]);
 host.append(el('h3','','Interview preparation'));for(const [i,x] of (r.interviewPreparation||[]).entries())host.append(el('h4','',`${i+1}. ${x.question}`),el('p','',`Assessed topic: ${x.whatEvaluated}`),el('p','',`Answer framework: ${x.answerFramework}`));
 host.append(el('h3','','Resume alignment'));if(r.resumeReview?.status==='provided'){addList(host,'Recommended improvements',r.resumeReview.changes);addList(host,'Confirm before using',r.resumeReview.missingEvidence);}else host.append(el('p','','Resume not submitted. You can return later for optional resume improvement.'));
 host.append(el('p','micro','The scenario assessment measures professional judgement, not verified work performance. Career history is self-reported.'));
}
function openResume(){if(!state.resumeRevision)return;reportKind='resume';const r=state.resumeRevision,host=openDialog('Revised Resume – review before use');host.append(el('h3','',r.headline),el('p','',r.summary));addList(host,'Core skills',r.coreSkills);for(const x of r.experience||[])addList(host,[x.role,x.employer,x.period].filter(Boolean).join(' · '),x.bullets);addList(host,'Education',r.education);addList(host,'Certifications',r.certifications);addList(host,'Facts to confirm',r.missingEvidence);}
async function init(){try{const config=await api('config');configured=!!config.configured;privatePreview=!!config.privatePreview;const codeRow=$('previewCodeRow');if(codeRow)codeRow.classList.toggle('hidden',!privatePreview);$('accessCode').required=privatePreview;if(!configured)notice('Career Buddy is not configured. Please contact support.',true);if(config.paymentConfigurationError)notice('Payment mode is configured but the required Razorpay keys are missing or invalid. Check Vercel settings.',true);try{state=(await api('state')).state;}catch{} }catch(e){notice(e.message,true);}if(state){flow=state.journeyPreference||'free';goAssessment();}else show('Choose');}
$('chooseAssessment').onclick=()=>choose('free');$('backToChoice').onclick=()=>show('Choose');$('homeButton').onclick=()=>show('Choose');$('myReportsButton').onclick=()=>{show('Reports');paint();};$('coachNavButton').onclick=goCoach;$('signOutButton').onclick=async()=>{await run(async()=>{await api('logout',{});state=null;notice('Signed out. Verify your email to resume later.');show('Choose');});};
$('loginForm').onsubmit=async e=>{e.preventDefault();await run(async()=>{if(!configured)throw Error('The preview services are not configured.');await api('requestCode',{email:$('emailAddress').value.trim(),previewCode:$('accessCode').value});$('loginForm').classList.add('hidden');$('verifyForm').classList.remove('hidden');$('authHelp').textContent='Code sent. Check your email and enter the six digits below.';toPageStart('Login');});};
$('verifyForm').onsubmit=async e=>{e.preventDefault();await run(async()=>{state=(await api('verifyCode',{email:$('emailAddress').value.trim(),previewCode:$('accessCode').value,code:$('otpCode').value.trim()})).state;notice('Email verified. Your progress is saved.');state=(await api('setJourney',{journey:flow==='premium'?'premium':'free'})).state;goAssessment();});};
$('snapshotDownload').onclick=()=>download('free');$('snapshotView').onclick=openFree;$('snapshotUpgrade').onclick=async()=>{await choose('premium');};$('snapshotCoach').onclick=goCoach;$('backSnapshot').onclick=()=>{show('Snapshot');paint();};$('activateStarter').onclick=()=>activate('starter','starterCoupon');$('activateIntro').onclick=()=>activate('intro','introCoupon');$('saveResume').onclick=()=>saveResume(false);$('skipResume').onclick=()=>saveResume(true);$('resumePaste').oninput=()=>{$('resumeCount').textContent=`${$('resumePaste').value.length.toLocaleString()} / 12,000 characters`;};
$('viewDetailed').onclick=openDetailed;$('downloadDetailed').onclick=()=>download('report');$('buildResume').onclick=buildResume;$('downloadDocx').onclick=()=>download('resume','docx');$('downloadResumePdf').onclick=()=>download('resume');$('resumeLater').onclick=()=>{show('Resume');paint();};$('toolkitCoach').onclick=goCoach;
$('coachCreditPill').onclick=()=>{show('Refills');paint();};
for(const button of document.querySelectorAll('[data-coach-prompt]')){
 button.onclick=()=>{const input=$('chatInput');if(input.disabled)return;input.value=button.dataset.coachPrompt;input.dispatchEvent(new Event('input'));input.focus({preventScroll:true});};
}
$('chatForm').onsubmit=submitChat;$('chatInput').oninput=()=>{$('chatCount').textContent=`${$('chatInput').value.length.toLocaleString()} / 1,200 characters`;};$('chatInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chatForm').requestSubmit();}};
$('checkPaymentStatus').onclick=reconcileTestPayment;
$('buyStandard').onclick=()=>activate('standard','refillCoupon');$('buyExtended').onclick=()=>activate('extended','refillCoupon');$('refillBack').onclick=goCoach;
$('resetSession').onclick=async()=>{const ownerCode=prompt('Owner-only reset: enter the OWNER_RESET_CODE.');if(!ownerCode)return;await run(async()=>{state=(await api('ownerReset',{ownerCode})).state;notice('Test session reset. Your API usage logs remain available.');setFlow('free');goAssessment();});};
$('closeDialog').onclick=$('dialogDone').onclick=()=>$('reportDialog').close();$('dialogDownload').onclick=()=>download(reportKind==='resume'?'resume':reportKind,reportKind==='resume'?'docx':'pdf');
init();
