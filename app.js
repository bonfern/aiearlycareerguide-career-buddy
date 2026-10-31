/* Career Buddy V5.27: honest task progress and single report caveat. */
const $=id=>document.getElementById(id);
const APP_BASE=window.location.pathname.startsWith('/professionals/') || window.location.pathname==='/professionals' ? '/professionals' : '';
const servicePath=()=>`${APP_BASE}/api/service`;
const CONSENT_VERSION='career-buddy-privacy-2026-10-27';
function browserId(){
 try{const key='cb-free-browser-id-v1';let value=localStorage.getItem(key);
  if(!value){value=crypto.randomUUID();localStorage.setItem(key,value);}return value;
 }catch{return '';}
}


const screens=['Choose','Login','Free','Snapshot','Upgrade','Paid','Toolkit','CoachOffer','Coach','Refills','Reports'];
let state=null,configured=false,privatePreview=true,flow='free',current='Choose',loading=false,reportKind='free',preparationError='',freeBackDraft=null;
let reportPolling=false,reportProgressText='',reportPhase='starting',assessmentPreparing=false,assessmentPrepText='',activeProcessingTask=false;
const uuid=()=>crypto.randomUUID();
const money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
async function api(action,data){const r=await fetch(`${servicePath()}?action=${encodeURIComponent(action)}`,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json','X-Buddy-Browser-Id':browserId()}:{'X-Buddy-Browser-Id':browserId()},body:data?JSON.stringify(data):undefined});let out={};try{out=await r.json();}catch{}if(!r.ok)throw Error(out.error||`Request failed (${r.status})`);return out;}
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
function notice(text='',isError=false){if(loading&&!activeProcessingTask&&text&&!isError&&$('processingText'))$('processingText').textContent=text.slice(0,170);$('notice').textContent=text;$('notice').className=text?`notice${isError?' error':''}`:'notice hidden';}
function show(screen){
 if(document.activeElement instanceof HTMLElement)document.activeElement.blur();
 if(current!==screen)notice(''); // Notices belong to their originating screen.
 current=screen;for(const name of screens)$('screen'+name).classList.toggle('hidden',name!==screen);
 $('topnav').classList.toggle('hidden',!state);
 $('testerTools').classList.toggle('hidden',!state||state.mode!=='preview');$('signedEmail').textContent=state?.email?`Verified as ${state.email}`:'';
 syncPaymentLabels(); // Scoped payment recovery UI cannot float above unrelated screens.
 toPageStart(screen);
}
function setFlow(next){flow=next;try{sessionStorage.setItem('buddy-v53-intent',next);}catch{}}
function isAssessmentPaid(){return state?.tier==='paid';}
function isCoachActive(){return Boolean(state?.freeReport||state?.reportGenerated)&&(state?.tier==='paid'||state?.tier==='coach');}
function goAssessment(){if(!state){show('Login');return;}if(!state.freeReport){show('Free');$('freeIntroNote').textContent='Your responses create a personalised career snapshot. You can review and change your answers before generating it.';}else if(isAssessmentPaid())show(state.reportGenerated?'Toolkit':'Paid');else if(flow==='premium')show('Upgrade');else show('Snapshot');paint();}
function goPremium(){setFlow('premium');if(!state){show('Login');return;}if(state.freeReport){goAssessment();return;}show('Free');paint();}
function goCoach(){if(!state){show('Login');return;}if(!state.freeReport&&!state.reportGenerated){show('Free');paint();notice('Complete your free career snapshot before starting Career Buddy coaching.');return;}if(isCoachActive())show('Coach');else show('CoachOffer');paint();}
async function choose(next){setFlow(next);if(!state){show('Login');return;}await run(async()=>{state=(await api('setJourney',{journey:next})).state;notice('');goAssessment();});}
function paint(){if(!state)return;const s=current;
 if(s==='Free')paintQuestion(true);
 if(s==='Upgrade'){const role=state.profile?.targetGoalRole||'';const field=$('assessmentRole');if(field&&!field.value&&role&&!/^(?:still exploring|not sure|unsure|undecided|exploring|get promoted|earn a higher salary|move into leadership|build future-ready skills)$/i.test(role))field.value=role;}
 if(s==='Paid')paintPaidAssessment();
 if(s==='Snapshot')paintSnapshot();

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
async function run(work,task=null){
 if(loading)return;
 loading=true;activeProcessingTask=Boolean(task);syncBusyControls();$('processingOverlay')?.classList.remove('hidden');setProcessingInfo(task?.title||'Processing',task?.message||'Saving your progress…',task?.stages||[]);
 try{await work();}
 catch(e){notice(e.message,true);}
 finally{loading=false;activeProcessingTask=false;syncBusyControls();$('processingOverlay')?.classList.add('hidden');}
}
// Display only stages supported by the backend, not invented percentage progress.
function taskSteps(items,active){
 const list=el('ol','task-steps');
 for(const [index,label] of items.entries()){
  const status=index<active?'complete':index===active?'active':'pending';
  const line=el('li',`task-step ${status}`);
  line.append(el('span','task-step-symbol',status==='complete'?'✓':status==='active'?'◌':'·'),el('span','',label));
  list.append(line);
 }
 return list;
}
function reportStage(){
 if(reportPhase==='interview')return 1;
 if(['queued','in_progress'].includes(reportPhase))return 2;
 return 1; // Interview bank and model job have not yet been confirmed.
}
function reportProgressPanel(){
 const panel=el('div','task-progress-panel');panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
 const heading=el('div','task-progress-heading');heading.append(el('span','task-spinner'));
 heading.append(el('strong','','Creating your personalised career report'));
 panel.append(heading,el('p','task-time-note','Usually 2–3 minutes. Complex reports may take longer; please keep this page open.'));
 panel.append(taskSteps(['Checking your completed assessment','Preparing role-specific interview topics','Writing your detailed report','Final checks and saving to My reports'],reportStage()));
 panel.append(el('p','task-live-message',reportProgressText||'Starting report generation…'));
 panel.append(el('p','micro','Your assessment answers are already saved. You can return to this screen to check the report.'));
 return panel;
}
function cleanAssessedResult(value){return String(value||'').replace(/\s*This evaluates decision-making, not verified job performance\.?/gi,'').trim();}
const REPORT_SCOPE_NOTE='This report combines your self-reported career information with results from role-specific scenario questions. Scenario answers assess professional judgement, not independently verified on-the-job performance. Use the recommendations as guidance and validate skills through real work examples.';
function setProcessingInfo(title,message,stages=[]){
 $('processingTitle').textContent=title;
 $('processingText').textContent=message;
 const extra=$('processingExtra');if(!extra)return;
 extra.replaceChildren();
 if(stages.length)extra.append(taskSteps(stages,1));
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
  if(!a.started){
  const completed=Math.max(0,Math.min(2,Number(a.preparationStep||0)));
  const steps=[
   'Identifying the essential skills for your chosen role',
   'Creating the first set of workplace scenarios',
   'Preparing and reviewing the remaining scenarios'
  ];
  host.append(el('h2','','Your role-specific assessment'));
  host.append(el('p','muted','Your assessment will have 12–15 multiple-choice scenarios covering 4–5 important skills.'));
  const status=el('div','assessment-stage-status');
  status.setAttribute('role','status');
  status.append(el('strong','',assessmentPreparing?`Preparing step ${Math.min(completed+1,3)} of 3`:completed?`Step ${completed} of 3 completed`:'Ready to prepare your assessment'));
  status.append(el('p','',assessmentPreparing?steps[completed]+'…':completed===2?'Your first question set is saved. The final set is next.':completed===1?'Your role competencies are saved. Question preparation is next.':'You can start preparing your questions below.'));
  if(assessmentPreparing){status.append(el('p','task-time-note','Usually 2–3 minutes in total. Longer requests may take additional time. Keep this page open.'));}
  status.append(taskSteps(steps,completed));
  if(!assessmentPreparing&&completed)status.append(el('p','micro',
   Number(a.savedQuestionCount||0)>0?`${a.savedQuestionCount} questions saved. You can continue without starting over.`:'Your completed steps are saved. You can continue without starting over.'));
  host.append(status);
  if(preparationError)host.append(el('p','question-error',preparationError));
  const text=assessmentPreparing?'Preparing…':preparationError?'Try again':completed?'Continue preparation':'Prepare my assessment';
  const b=el('button','primary',text);b.dataset.asyncAction='1';b.disabled=loading||assessmentPreparing;b.onclick=prepareAssessment;host.append(b);
  return;
 }
 if(a.finished){
  host.append(el('h2','','Your competency assessment is complete.'),el('p','muted',`You answered ${total} scenario questions across ${a.competencies.length} essential skills. Your report will combine these responses with your career profile.`));
  const b=el('button','primary',reportPolling?'Report processing…':state?.reportPreparing?'Resume report generation →':'Generate my detailed career report →');b.dataset.asyncAction='1';b.disabled=reportPolling||loading;b.onclick=generateDetailed;host.append(b);
  if(reportPolling||state?.reportPreparing)host.append(reportProgressPanel());else host.append(el('p','micro','Generating the report usually takes 2–3 minutes, and may take longer for complex assessments. You will see live stage updates after starting.'));return;
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
 error.setAttribute('role','alert');
 for(const input of inputs)input.onchange=()=>{error.textContent='';};
 const b=el('button','primary','Save answer and continue →');b.type='button';b.dataset.asyncAction='1';b.disabled=loading;
 b.onclick=()=>{
  if(loading)return;
  const pick=inputs.find(x=>x.checked);
  if(!pick){error.textContent='Select one option to continue.';return;}
  void answerPaid(q.id,Number(pick.value),error);
 };
 actions.append(el('span','micro',`Question ${q.number} of ${q.total}`),b);host.append(actions,error);
}
// The question bank is graded and persisted on the server. Never increment the
// question index locally: the next question must come from the saved state.
// Retain the request ID across a failed retry so server-side idempotency applies.
let pendingPaidAnswer=null;
async function answerPaid(questionId,choice,errorNode){
 if(loading)return;
 const prior=pendingPaidAnswer;
 const requestId=prior?.questionId===questionId&&prior.choice===choice?prior.requestId:uuid();
 pendingPaidAnswer={questionId,choice,requestId};
 errorNode.textContent='';
 await run(async()=>{
  try{
   const response=await api('assessmentAnswer',{questionId,choice,requestId});
   if(!response?.state?.assessment)throw Error('Could not confirm the saved answer. Please retry or refresh your assessment.');
   state=response.state;
   pendingPaidAnswer=null;
   if(current==='Paid'){paintPaidAssessment();toPageStart('Paid');}
  }catch(e){
   // A failed save leaves the current answer available for correction/retry.
   // Do not silently swallow the error or advance without server confirmation.
   errorNode.textContent=e?.message||'Could not save your answer. Please try again.';
  }
 });
}
async function prepareAssessment(){
 if(assessmentPreparing)return;
 assessmentPreparing=true;preparationError='';
 try{
  for(let step=0;step<3;step++){
   if(state?.assessment?.started)break;
   const progress=Number(state?.assessment?.preparationStep||0);
   assessmentPrepText=`Preparing step ${Math.min(progress+1,3)} of 3. Your completed progress is saved.`;
   if(current==='Paid')paintPaidAssessment();
   const response=await api('assessmentStart',{requestId:uuid()});
   state=response.state;
   if(current==='Paid')paintPaidAssessment();
  }
  if(!state?.assessment?.started)throw Error('Preparation is paused. Select Continue preparation to resume.');
  assessmentPrepText='';
 }catch(e){
  // Refresh the saved stage after a rejected batch so the user sees exactly
  // how much of their paid preparation was retained. No additional AI call.
  try{state=(await api('state')).state;}catch{}
  preparationError=e.message;
 }
 finally{assessmentPreparing=false;if(current==='Paid'){paintPaidAssessment();toPageStart('Paid');}}
}

function paintQuestion(free){const name=free?'free':'paid',host=$(name+'Question'),guided=state.guided||{},q=guided.question;
 const progress=(guided.completed||0)/(guided.total||7);$(name+'Progress').style.width=`${Math.round(100*progress)}%`;$(name+'Counter').textContent=`${guided.completed||0} of ${guided.total||7} topics completed`;
 host.replaceChildren();
 if(!q){const ready=free?state.freeReportReady:state.reportReady;host.append(el('h2','',free?'Your free discovery questions are complete.':ready?'Your detailed report is ready to generate.':'A little more context is needed.'));
  host.append(el('p','muted',free?(state.freeReportReady?'Create your concise snapshot. You can download it now or at any time in My reports.':'A required area is incomplete. Please review the missing details before requesting a snapshot.'):ready?'Your initial detailed report is included and does not cost a chat interaction.':'You can use paid coaching to provide additional examples and clarify any missing areas.'));
  if(!ready){const missing=free?(state.freeReadiness?.missing||[]):(state.readiness?.missing||[]);if(missing.length)addList(host,'Information still needed',missing);}
  if(free&&(guided.completed||0)>0){const review=el('button','secondary','← Review and change my answers');review.dataset.asyncAction='1';review.disabled=loading;review.onclick=rewindFree;host.append(review,el('p','micro','You can review your answers before generating your snapshot.'));}
  const button=el('button','primary',free?'Generate free snapshot →':ready?'Generate detailed report →':'Ask Career Buddy for guidance →');button.dataset.asyncAction='1';if(free)button.dataset.requiresFreeReady='1';button.onclick=()=>free?generateFree():ready?generateDetailed():goCoach();button.disabled=loading||(free&&!state.freeReportReady);host.append(button);return;}
 host.append(el('h2','',q.text));
 const choices=el('div','answers'),inputs=[];
 const draft=free&&freeBackDraft?.id===q.id?freeBackDraft:null;
 const multiLimit=q.kind==='multi'?(q.maxSelections||4):null;
 const countLabel=`Select up to ${multiLimit}`;
 const selectedCount=q.kind==='multi'?el('p','micro',`${countLabel} · 0 selected`):null;
 if(selectedCount)host.append(selectedCount);
 if(q.kind!=='text'){
  for(const op of q.options||[]){const row=el('label','answer');const input=document.createElement('input');input.type=q.kind==='multi'?'checkbox':'radio';input.name='answerOption';input.value=op;if(draft)input.checked=Array.isArray(draft.value)?draft.value.includes(op):draft.value===op;row.append(input,el('span','',op));choices.append(row);inputs.push(input);}
  host.append(choices);
 }
 let txt=null,other=null,detail=null;
 if(q.kind==='text'){txt=el('textarea');txt.id='answerText';txt.maxLength=q.maxLength||300;txt.placeholder=q.placeholder||'A short answer is enough';txt.rows=3;if(draft)txt.value=String(draft.value||'');host.append(txt,el('div','help-text',q.id==='targetGoalRole'?'A specific role helps us personalise your snapshot. If you have not decided, enter Still exploring.':q.example?'One specific project, task or learning activity is enough. If you have no example yet, choose Skip.':`Up to ${txt.maxLength} characters. Avoid sharing contact details.`));}
 else {other=el('input');other.type='text';other.maxLength=120;other.placeholder='Please specify briefly';other.className='hidden';if(draft){other.value=draft.other||'';other.classList.toggle('hidden',!inputs.some(x=>x.checked&&x.value==='Other'));if(selectedCount)selectedCount.textContent=`${countLabel} · ${inputs.filter(x=>x.checked).length} selected`;}host.append(other);
  if(q.detailLabel){const detailLabel=el('label','help-text',q.detailLabel);detail=el('textarea');detail.id='strengthEvidence';detail.rows=2;detail.maxLength=q.detailMaxLength||300;detail.placeholder=q.detailPlaceholder||'Optional example or relevant tool';if(draft)detail.value=draft.detail||'';host.append(detailLabel,detail);}
  for(const input of inputs)input.onchange=()=>{
  if(q.kind==='multi'&&input.checked){
   if(input.value==='No hands-on experience yet'){inputs.forEach(x=>{if(x!==input)x.checked=false;});}
   else{const none=inputs.find(x=>x.value==='No hands-on experience yet');if(none)none.checked=false;}
   if(inputs.filter(x=>x.checked).length>multiLimit){input.checked=false;error.textContent=`Select up to ${multiLimit} options.`;}
   else error.textContent='';
  }
  if(selectedCount)selectedCount.textContent=`${countLabel} · ${inputs.filter(x=>x.checked).length} selected`;
  other.classList.toggle('hidden',!inputs.some(x=>x.checked&&x.value==='Other'));
 };}
 const row=el('div','question-actions'),error=el('div','question-error');
 if(free&&(guided.completed||0)>0){const back=el('button','secondary','← Previous');back.type='button';back.dataset.asyncAction='1';back.disabled=loading;back.onclick=rewindFree;row.append(back);}else if(!q.optional)row.append(el('span','micro','You can change earlier answers before generating the free snapshot.'));
 if(q.optional){const skip=el('button','secondary',q.skipLabel||'Skip');skip.type='button';skip.dataset.asyncAction='1';skip.disabled=loading;skip.onclick=()=>sendQuick(q,true);row.append(skip);}
 const submit=el('button','primary','Continue →');submit.onclick=()=>{let value=q.kind==='text'?txt.value.trim():q.kind==='multi'?inputs.filter(x=>x.checked).map(x=>x.value):(inputs.find(x=>x.checked)?.value||'');if(!value||Array.isArray(value)&&!value.length){error.textContent=q.optional?'Enter your answer or choose the skip option.':'Choose an answer to continue.';return;}if(q.kind==='multi'&&value.length>(q.maxSelections||4)){error.textContent=`Select up to ${q.maxSelections||4} options.`;return;}if(q.kind==='multi'&&value.length<(q.minSelections||1)){error.textContent=`Choose at least ${q.minSelections||1} options.`;return;}if(q.kind!=='text'&&(Array.isArray(value)?value.includes('Other'):value==='Other')&&!other?.value?.trim()){error.textContent='Please describe your Other selection.';other?.focus();return;}sendQuick(q,false,value,other?.value?.trim()||'',detail?.value?.trim()||'');};row.append(submit);host.append(row,error);
}
async function rewindFree(){await run(async()=>{const v=await api('quickBack',{});state=v.state;freeBackDraft=v.draft||null;notice('You can update your answer.');paintQuestion(true);toPageStart('Free');});}
async function sendQuick(q,skip,value,other='',detail=''){await run(async()=>{const v=await api('quick',{questionId:q.id,skip,value,other,detail,requestId:uuid()});state=v.state;freeBackDraft=null;notice('');paint();toPageStart(current);});}
// Existing saved V5.10 snapshots are still usable. Bring their two role-guidance
// preparation examples into the one consolidated 'What we need to check next' section.
function freeChecks(r={}){
 const checks=[...(r.furtherAssessment||[])];
 if(checks.length<=4){for(const step of (r.nextSteps||[]).slice(0,2)){
  if(step?.title&&step?.bullets?.[1])checks.push(`Preparation example: ${step.title} — ${step.bullets[1]}`);
 }}
 return checks;
}
// V5.22: concise FREE report. Premium continues to own scored gaps and development plans.
function renderFocusedFreeSnapshot(host,r){
 host.append(el('h3','','1. Your career profile'),el('p','',r.profileSummary||''));
 host.append(el('h3','','Your transferable advantage'),el('p','',r.transferableAdvantage||''));
 host.append(el('h3','','Four important skills for your target direction'));
 const skills=el('ul','free-role-skills');for(const skill of (r.targetCompetencies||[]).slice(0,4)){const item=el('li');item.append(el('strong','',skill.title),document.createTextNode(' — '+(skill.bullets?.[0]||'A relevant foundational skill.')));skills.append(item);}host.append(skills);
 host.append(el('h3','','2. Three career pathways to explore'));
 const paths=el('ol','ranked-career-paths');for(const path of (r.careerOpportunities||[]).slice(0,3))paths.append(el('li','',path));host.append(paths);
 host.append(el('h3','','3. Your three immediate next moves'));
 const actions=el('ol','ranked-career-actions');for(const action of (r.nextBestMoves||[]).slice(0,3))actions.append(el('li','',action));host.append(actions);
 host.append(el('h3','','4. What a Premium Assessment evaluates'));
 const checks=el('ul');for(const item of (r.furtherAssessment||[]).slice(0,3))checks.append(el('li','',item));host.append(checks);
 host.append(el('p','snapshot-disclaimer','Your free snapshot is based on self-reported answers, not tested competency scores.'));
}
function paintSnapshot(){const r=state.freeReport||{},view=$('snapshotSummary');view.replaceChildren();
 if(!state.freeReport){view.append(el('p','','Finish the free discovery first.'));return;}
 if(r.version>=6){renderFocusedFreeSnapshot(view,r);}
 else if(r.version>=5){
  // Opening section intentionally contains ONLY goal, target-role skills and
  // user-reported exposure. Assessment limitations appear at the bottom.
  view.append(el('h3','','Your goal and starting point'),el('p','',r.profileSummary||''));
  addList(view,'Skills important for your target role',(r.targetCompetencies||[]));
  addList(view,'Strengths you selected',r.reportedStrengths?.length?r.reportedStrengths:['No strengths selected yet.']);
  addList(view,'Tools or practical examples you mentioned',r.reportedExposure?.length?r.reportedExposure:['No specific tools or work examples provided.']);
  view.append(el('h3','','Your transferable advantage'),el('p','',r.transferableAdvantage||''));
  if(r.careerOpportunities?.length)addList(view,'Career opportunities worth exploring',r.careerOpportunities);
  view.append(el('h3','','Your career alignment'),el('p','',r.careerAlignment||''));
  addList(view,'Your next best moves',r.nextBestMoves||[]);
  addList(view,'What a deeper assessment could reveal',r.furtherAssessment||[]);
  view.append(el('p','snapshot-disclaimer','This free snapshot interprets your own answers. It is not a verified competency score; the optional Premium Assessment evaluates role-specific decisions in greater depth.'));
 }else{
  view.append(el('h3','','Your professional profile'),el('p','',r.profileSummary||''));
  addList(view,'Skills your target role needs',(r.targetCompetencies||[]));
  addList(view,'What we need to check next (Premium Assessment)',freeChecks(r));
  view.append(el('p','snapshot-disclaimer','Your saved snapshot is based on self-reported answers; it is not a verified competency score.'));
 }
}
function paintToolkit(){$('remainingNote').textContent=`${state.credits||0} Career Buddy coaching credits remaining. Your report is saved under My reports.`;}
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
  {label:'Review my resume · 5 credits',question:'resume-review'},
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
  ?`Career direction: ${target.slice(0,85)}.`
  :'Based on your saved career discovery answers.';
 for(const [i,b] of document.querySelectorAll('[data-coach-prompt]').entries()){
  const suggestion=items[i];if(!suggestion)continue;
  b.dataset.coachPrompt=suggestion.question;
  b.replaceChildren(document.createTextNode(suggestion.label+' '),el('span','','↗'));
 }
}
function paintCoach(){
 const rem=Number(state.credits||0);
 $('resumeReviewOpen').disabled=loading||rem<5||Boolean(state.expired);
 $('coachCreditPill').textContent=`${rem} credit${rem===1?'':'s'} left · Refill`;
 const warn=state.warning||((rem<=0)?'Your coaching credits are exhausted. Refill to continue; previous messages remain visible.':state.expired?'Your pack has expired. Refill to continue; previous messages remain visible.':'');
 $('creditWarning').classList.toggle('hidden',rem>10&&!state.expired&&!warn.trim());
 $('creditWarning').textContent=warn;
 paintCoachPrompts();
 const msgs=state.messages||[];
 const hasConversation=msgs.some(m=>m.role==='user');
 // Show the resume tool as the first prompt, then as a persistent action in an active chat.
 $('resumeReviewOpen').parentElement.classList.toggle('hidden',!hasConversation);
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
 if(state.resumeReviews?.length)item('Career Buddy Resume Reviews','Your saved role-specific resume feedback.',[['View latest',()=>openResumeReview(state.resumeReviews.at(-1))],['Download PDF',()=>downloadResumeReview(state.resumeReviews.at(-1).id)]]);
 if(state.freeReport){const b=el('button','secondary','Continue with Career Buddy →');b.onclick=goCoach;host.append(b);}
 if(!state.freeReport&&!state.reportGenerated&&!state.resumeReviews?.length)host.append(el('p','muted','Your reports will appear here after you generate them.'));
}
async function generateFree(){await run(async()=>{notice('Generating your short free snapshot…');state=(await api('freeReport',{requestId:uuid()})).state;notice('Your free snapshot is saved and ready to download.');show('Snapshot');paint();},{title:'Creating your free career snapshot',message:'Preparing your career profile and relevant skills. This may take a minute on slower requests.'});}
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
  let settled=false;
  const rzp=new window.Razorpay({
   key:checkout.keyId,amount:checkout.amountPaise,currency:'INR',order_id:checkout.orderId,
   name:checkout.name,description:checkout.description,prefill:{email:checkout.email},
   theme:{color:'#15294e'},
   handler:data=>{if(settled)return;settled=true;if($('processingOverlay'))$('processingOverlay').classList.remove('hidden');resolve({orderId:data.razorpay_order_id,paymentId:data.razorpay_payment_id,signature:data.razorpay_signature});},
   modal:{ondismiss:()=>{if(settled)return;settled=true;resolve({cancelled:true});}}
  });
  rzp.on('payment.failed',()=>{ /* Keep the checkout open for retry. No credits granted. */ });
  // Payment modal owns focus while open; do not leave the loading mask above it.
  $('processingOverlay')?.classList.add('hidden');
  rzp.open();
 });
}
function afterPurchase(packId,statusMessage=''){
 if(packId==='starter'){setFlow('premium');show(state.reportGenerated?'Toolkit':'Paid');}
 else show('Coach');
 paint();
 if(statusMessage)notice(statusMessage);
}
async function activate(packId,couponId){
 await run(async()=>{
  const couponCode=$(couponId)?.value?.trim()||'';
  if(packId==='starter'&&state?.profile?.freeIntakeVersion>=18){
   const role=$('assessmentRole')?.value?.trim()||'';
   if(role.length<3)throw Error('Please enter the specific job role you want assessed.');
   state=(await api('setAssessmentRole',{role})).state;
  }
  if(state?.paymentMode==='razorpay_live'&&state.checkoutReady===false&&!couponCode){
   throw Error('Paid checkout is not yet enabled. Please try again later or enter an eligible complimentary coupon.');
  }
  if(state?.paymentMode==='razorpay_live'){
   notice('Checking your discount or preparing secure payment…');
   const result=await api('liveCheckout',{packId,couponCode,requestId:uuid()});
   if(result.kind==='complimentary'){state=result.state;afterPurchase(packId,result.notice);}
   else{
    state.pendingLiveCheckout={orderId:result.checkout.orderId};syncPaymentLabels();
    notice(`Opening secure Razorpay checkout for ${money(result.checkout.amountPaise / 100)}. Confirm the amount before paying.`);
    const payment=await openTestCheckout(result.checkout);
    if(payment.cancelled){
     const released=await api('liveCheckoutDismiss',{orderId:result.checkout.orderId});
     state=released.state;syncPaymentLabels();notice(released.notice);paint();
     if(state?.tier==='paid'&&packId==='starter')afterPurchase(packId,released.notice);
     return;
    }
    const verified=await api('livePaymentVerify',payment);
    state=verified.state;afterPurchase(packId,verified.notice);
   }
  }else if(state?.paymentMode==='razorpay_test'){
   notice('Opening secure checkout in test mode.');
   const order=await api('testCheckout',{packId,couponCode,requestId:uuid()});
   state.pendingTestCheckout={orderId:order.checkout.orderId};syncPaymentLabels();
   const payment=await openTestCheckout(order.checkout);
   const verified=await api('testPaymentVerify',payment);
   state=verified.state;afterPurchase(packId,verified.notice);
  }else{
   const out=await api('mockPurchase',{packId,couponCode,requestId:uuid()});
   state=out.state;notice(out.notice);afterPurchase(packId);
  }
 });
}
async function reconcileTestPayment(){
 await run(async()=>{
  const reply=await api(state?.paymentMode==='razorpay_live'?'livePaymentStatus':'testPaymentStatus',{});state=reply.state;notice(reply.notice);
  if(state?.tier==='paid')show('Paid');
  else if(state?.tier==='coach')show('Coach');
  paint();
 });
}
function syncPaymentLabels(){
 const test=state?.paymentMode==='razorpay_test',live=state?.paymentMode==='razorpay_live',external=test||live;
 for(const [id,text] of [['activateStarter','Proceed'],['activateIntro','Proceed']]){
  const node=$(id);if(node)node.textContent=text;
 }
 const notice=$('paymentModeNote');if(notice)notice.textContent=live?'Live payment mode: the final payable amount appears before payment confirmation.':test?'Razorpay TEST MODE: simulated transactions with no real charges.':'Owner simulation mode: credits activate without a payment.';
 for(const warning of document.querySelectorAll('.checkout-setup-notice')){
  const showWarning=Boolean(live&&state?.checkoutReady===false);
  warning.classList.toggle('hidden',!showWarning);
  if(showWarning)warning.textContent='Paid checkout is not yet enabled. An eligible 100% complimentary coupon can still be redeemed.';
 }
 const recover=$('paymentRecovery');
 if(recover)recover.classList.toggle('hidden',!['Upgrade','CoachOffer','Refills'].includes(current)||!external||!(live?state?.pendingLiveCheckout:state?.pendingTestCheckout));
}
async function generateDetailed(){
 if(reportPolling)return;
 reportPolling=true;reportPhase=state?.reportPreparing?'queued':'starting';
 reportProgressText='Starting report generation. Your completed answers are saved.';
 if(current==='Paid')paintPaidAssessment();
 try{
  // A request either prepares a shared interview bank, starts one background
  // model response, or checks its status. Each HTTP call returns promptly.
  for(let check=0;check<120;check++){
   const response=await api('report',{requestId:uuid()});
   if(response.state)state=response.state;
   if(response.completed||state?.reportGenerated){
    reportProgressText='';reportPolling=false;
    if(current==='Paid'){show('Toolkit');paint();notice('Your detailed report is saved.');}
    else if(current==='Reports')paintReports();
    return;
   }
   if(!response.preparing)throw Error('Report processing was interrupted. Return to Premium Assessment to resume.');
   reportPhase=response.phase||reportPhase;
   reportProgressText=response.notice||'Preparing your report…';
   if(current==='Paid')paintPaidAssessment();
   await new Promise(resolve=>setTimeout(resolve,5000));
  }
  reportProgressText='Report preparation is continuing. Return here to check its status.';
 }catch(e){
  reportProgressText='Report preparation was interrupted. Your completed answers are saved; you can resume here.';
  if(current==='Paid')notice(e.message,true);
 }finally{reportPolling=false;if(current==='Paid')paintPaidAssessment();}
}
function toggleResumeReview(open){
 $('resumeReviewPanel').classList.toggle('hidden',!open);
 if(open){$('resumeReviewPanel').scrollIntoView({block:'center',behavior:'smooth'});$('coachResumeText').focus({preventScroll:true});}
}
async function submitResumeReview(){await run(async()=>{
 const resumeText=$('coachResumeText').value.trim();
 if(resumeText.length<120)throw Error('Paste at least 120 characters of resume text.');if(!$('resumeConsent').checked)throw Error('Please consent to processing your resume text for review.');
 if(Number(state?.credits||0)<5)throw Error('Resume review requires five credits. Please refill your pack.');
 notice('Reviewing your resume and identifying improvements…');
 const r=await api('reviewResume',{requestId:uuid(),resumeText,resumeConsent:true});state=r.state;
 $('coachResumeText').value='';$('resumeConsent').checked=false;$('resumeReviewChars').textContent='0 / 16,000 characters';
 toggleResumeReview(false);paintCoach();
 const last=state.resumeReviews?.at(-1);if(last)openResumeReview(last);
 notice('Resume review complete. Five credits were used.');
 },{title:'Preparing your resume review',message:'Analysing your resume for role relevance and practical improvements. This can take around a minute or longer.',stages:['Resume received','Assessing content and role relevance','Saving actionable feedback']});}
function downloadResumeReview(id){window.location.assign(`${servicePath()}?action=download&kind=resume-review&format=pdf&id=${encodeURIComponent(id||'')}`);}
function openResumeReview(item){if(!item?.review)return;reportKind='resume-review';const r=item.review,host=openDialog('Career Buddy – Resume Review');
 host.append(el('h3','',r.headline||'Your resume review'));
 addList(host,'What is working',r.strengths);addList(host,'Missing evidence and information',r.missingDetails);
 addList(host,'Recommended corrections',r.corrections);
 host.append(el('h3','','Example of clearer wording'),el('p','',r.exampleImprovement||''));
 addList(host,'Your next actions',r.nextActions);
 $('dialogDownload').onclick=()=>downloadResumeReview(item.id);
}
async function submitChat(event){event.preventDefault();const input=$('chatInput'),message=input.value.trim();if(!message)return;await run(async()=>{if(message.length>1200)throw Error('Maximum 1,200 characters per message.');input.value='';$('chatCount').textContent='0 / 1,200 characters';const req=api('chat',{message,requestId:uuid()}); // Allow the user to see a waiting indicator without inventing a charged response.
 $('chatMessages').append(el('div','message','Career Buddy is preparing your response…'));try{state=(await req).state;notice('');paintCoach();}catch(e){input.value=message;paintCoach();throw e;}
 },{title:'Career Buddy is preparing your answer',message:'Reviewing your question against your saved career context. Longer requests may take around a minute.'});}
function download(kind,format='pdf'){window.location.assign(`${servicePath()}?action=download&kind=${encodeURIComponent(kind)}&format=${encodeURIComponent(format)}`);}
function openDialog(title){$('dialogDownload').onclick=()=>reportKind==='resume-review'?downloadResumeReview(state.resumeReviews.at(-1).id):download(reportKind);$('dialogTitle').textContent=title;$('reportContent').replaceChildren();$('reportDialog').showModal();$('reportDialog').scrollTop=0;$('reportContent').scrollTop=0;return $('reportContent');}
function openFree(){
 if(!state.freeReport)return;
 reportKind='free';const r=state.freeReport,host=openDialog('Your Free Career Snapshot');
 if(r.version>=6){renderFocusedFreeSnapshot(host,r);}
 else if(r.version>=5){
  host.append(el('h3','','Your goal and starting point'),el('p','',r.profileSummary||''));
  addList(host,'Skills relevant to your career direction',r.targetCompetencies||[]);
  addList(host,'Strengths you selected',r.reportedStrengths?.length?r.reportedStrengths:['No strengths selected yet.']);
  addList(host,'Tools or examples you mentioned',r.reportedExposure?.length?r.reportedExposure:['No specific tools or examples provided.']);
  host.append(el('h3','','Your transferable advantage'),el('p','',r.transferableAdvantage||''));
  if(r.careerOpportunities?.length)addList(host,'Career opportunities worth exploring',r.careerOpportunities);
  host.append(el('h3','','Your career alignment'),el('p','',r.careerAlignment||''));
  addList(host,'Your next best moves',r.nextBestMoves||[]);
  addList(host,'What a deeper assessment could reveal',r.furtherAssessment||[]);
  host.append(el('p','snapshot-disclaimer','Your free snapshot interprets self-reported information; competency scores require further assessment.'));
 }else{
  host.append(el('h3','','Your professional profile'),el('p','',r.profileSummary||''));
  addList(host,'Skills relevant to your career direction',r.targetCompetencies||[]);
  addList(host,'What a deeper assessment could reveal',freeChecks(r));
 }
}

function openDetailed(){if(!state.report)return;reportKind='report';const r=state.report,host=openDialog('Career Action & Skill Development Report');const scope=el('div','report-scope-callout');scope.append(el('strong','','How to interpret this report'),el('p','',REPORT_SCOPE_NOTE));host.append(scope);host.append(el('h3','','Your career objective'),el('p','',r.goalPath?.headline||''),el('h3','','Career summary'),el('p','',r.summary||''));
 for(const [title,items] of [['Technical capability priorities',r.capabilityFocus?.technical],['Leadership and soft-skill priorities',r.capabilityFocus?.behavioural]]){host.append(el('h3','',title));for(const x of items||[])host.append(el('h4','',x.name),el('p','',`${cleanAssessedResult(x.currentCompetency)} | ${x.priority}. ${x.firstAction}`));}
 host.append(el('h3','','Career actions'));for(const a of r.goalPath?.careerActions||[])host.append(el('h4','',a.title),el('p','',a.action),el('p','',`Expected outcome: ${a.outcome}`));
 host.append(el('h3','','Skill-by-skill plan'));for(const x of r.skillAssessments||[]){host.append(el('h4','',x.name),el('p','',`Role expectation: ${x.targetBenchmark}`),el('p','',`Scenario assessment result: ${cleanAssessedResult(x.currentCompetency)}`),el('p','',`Development focus: ${x.gap}`));addList(host,'Action steps',x.actions);host.append(el('p','',`Evidence task: ${x.practiceTask}`),el('p','',`Improvement indicator: ${x.successIndicator}`));}
 host.append(el('h3','','Other capabilities requiring assessment'));for(const x of r.additionalSkills||[])host.append(el('h4','',x.name),el('p','',x.expectation),el('p','',`Build: ${x.nextStep} · Verify: ${x.howToVerify}`));
 host.append(el('h3','','30 / 60 / 90-day execution plan'));for(const x of r.actionPlan||[])addList(host,`${x.period}: ${x.focus}`,x.actions);
 host.append(el('h3','','Progress and evidence checklist'));for(const x of r.progressChecklist||[])host.append(el('p','',`${x.skill}: ${x.deliverable} · ${x.evidence}`));
 addList(host,'Learning and professional development',[...(r.learningGuidance?.free||[]),...(r.learningGuidance?.paid||[]),...(r.learningGuidance?.certifications||[])]);
 host.append(el('h3','','Interview preparation'));for(const [i,x] of (r.interviewPreparation||[]).entries())host.append(el('h4','',`${i+1}. ${x.question}`),el('p','',`Assessed topic: ${x.whatEvaluated}`),el('p','',`Answer framework: ${x.answerFramework}`));

}
async function init(){$('processingOverlay')?.classList.remove('hidden');$('processingText').textContent='Loading your saved career journey…';try{const config=await api('config');configured=!!config.configured;privatePreview=!!config.privatePreview;const codeRow=$('previewCodeRow');if(codeRow)codeRow.classList.toggle('hidden',!privatePreview);$('accessCode').required=privatePreview;if(!configured)notice('Career Buddy is not configured. Please contact support.',true);if(config.paymentConfigurationError)notice('Payment mode is configured but the required Razorpay keys are missing or invalid. Check Vercel settings.',true);try{state=(await api('state')).state;}catch{} }catch(e){notice(e.message,true);}if(state){flow=state.journeyPreference||'free';}show('Choose');$('processingOverlay')?.classList.add('hidden');}
$('resumeReviewOpen').onclick=()=>toggleResumeReview(true);$('closeResumeReview').onclick=()=>toggleResumeReview(false);$('submitResumeReview').onclick=submitResumeReview;$('coachResumeText').oninput=()=>{$('resumeReviewChars').textContent=`${$('coachResumeText').value.length.toLocaleString()} / 16,000 characters`;};
$('chooseAssessment').onclick=()=>choose('free');$('backToChoice').onclick=()=>show('Choose');$('homeButton').onclick=()=>show('Choose');$('myReportsButton').onclick=()=>{show('Reports');paint();};$('premiumNavButton').onclick=goPremium;$('coachNavButton').onclick=goCoach;$('signOutButton').onclick=async()=>{await run(async()=>{await api('logout',{});state=null;notice('Signed out. Verify your email to resume later.');show('Choose');});};
$('loginForm').onsubmit=async e=>{e.preventDefault();await run(async()=>{if(!configured)throw Error('The service is currently unavailable. Please contact support.');if(!$('privacyConsent').checked||!$('adultConsent').checked)throw Error('Please review the privacy notice and age requirement.');await api('requestCode',{email:$('emailAddress').value.trim(),previewCode:$('accessCode').value,privacyConsent:true,adultConsent:true,consentVersion:CONSENT_VERSION});$('loginForm').classList.add('hidden');$('verifyForm').classList.remove('hidden');$('authHelp').textContent='Code sent. Check your email and enter the six digits below.';toPageStart('Login');});};
$('verifyForm').onsubmit=async e=>{e.preventDefault();await run(async()=>{state=(await api('verifyCode',{email:$('emailAddress').value.trim(),previewCode:$('accessCode').value,code:$('otpCode').value.trim()})).state;notice('Email verified. Your progress is saved.');state=(await api('setJourney',{journey:flow==='premium'?'premium':'free'})).state;goAssessment();});};
async function verifyCoupon(packId,inputId,statusId){
 const node=$(statusId),code=$(inputId).value.trim();
 if(!code){node.textContent='Enter a coupon code to check.';return;}
 node.textContent='Checking coupon…';
 try{
  if(packId==='starter'&&state?.profile?.freeIntakeVersion>=18&&!state?.profile?.assessmentTargetRole){
   const role=$('assessmentRole')?.value?.trim()||'';
   if(role.length<3)throw Error('Enter your target job role before checking this coupon.');
   state=(await api('setAssessmentRole',{role})).state;
  }
  const info=await api('couponStatus',{packId,couponCode:code});
  node.textContent=`Valid coupon: ${info.discountPercent}% off · Payable ${money(info.priceInr)}.`;
 }catch(e){node.textContent=e.message;}
}
$('checkStarterCoupon').onclick=()=>verifyCoupon('starter','starterCoupon','starterCouponStatus');$('checkIntroCoupon').onclick=()=>verifyCoupon('intro','introCoupon','introCouponStatus');
$('snapshotDownload').onclick=()=>download('free');$('snapshotView').onclick=openFree;$('snapshotUpgrade').onclick=async()=>{await choose('premium');};$('snapshotCoach').onclick=goCoach;$('backSnapshot').onclick=()=>{show('Snapshot');paint();};$('activateStarter').onclick=()=>activate('starter','starterCoupon');$('activateIntro').onclick=()=>activate('intro','introCoupon');
$('viewDetailed').onclick=openDetailed;$('downloadDetailed').onclick=()=>download('report');$('toolkitCoach').onclick=goCoach;
$('coachCreditPill').onclick=()=>{show('Refills');paint();};
for(const button of document.querySelectorAll('[data-coach-prompt]')){
 button.onclick=()=>{const input=$('chatInput');if(button.dataset.coachPrompt==='resume-review'){toggleResumeReview(true);return;}if(input.disabled)return;input.value=button.dataset.coachPrompt;input.dispatchEvent(new Event('input'));input.focus({preventScroll:true});};
}
$('chatForm').onsubmit=submitChat;$('chatInput').oninput=()=>{$('chatCount').textContent=`${$('chatInput').value.length.toLocaleString()} / 1,200 characters`;};$('chatInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chatForm').requestSubmit();}};
$('checkPaymentStatus').onclick=reconcileTestPayment;
$('buyStandard').onclick=()=>activate('standard','refillCoupon');$('buyExtended').onclick=()=>activate('extended','refillCoupon');$('refillBack').onclick=goCoach;
$('resetSession').onclick=async()=>{const ownerCode=prompt('Owner-only reset: enter the OWNER_RESET_CODE.');if(!ownerCode)return;await run(async()=>{state=(await api('ownerReset',{ownerCode})).state;notice('Test session reset. Your API usage logs remain available.');setFlow('free');goAssessment();});};
$('closeDialog').onclick=$('dialogDone').onclick=()=>$('reportDialog').close();$('dialogDownload').onclick=()=>reportKind==='resume-review'?downloadResumeReview(state.resumeReviews.at(-1).id):download(reportKind);
init();
