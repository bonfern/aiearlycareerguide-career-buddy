/* Career Buddy V5.3: assessment-first entry, with assessment-context coaching. */
const $=id=>document.getElementById(id);
const screens=['Choose','Login','Free','Snapshot','Upgrade','Resume','Paid','Toolkit','CoachOffer','Coach','Refills','Reports'];
let state=null,configured=false,flow='free',current='Choose',loading=false,reportKind='free';
const uuid=()=>crypto.randomUUID();
const money=n=>`₹${Number(n||0).toLocaleString('en-IN')}`;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=String(text);return node;};
async function api(action,data){const r=await fetch(`/api/service?action=${encodeURIComponent(action)}`,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});let out={};try{out=await r.json();}catch{}if(!r.ok)throw Error(out.error||`Request failed (${r.status})`);return out;}
function notice(text='',isError=false){$('notice').textContent=text;$('notice').className=text?`notice${isError?' error':''}`:'notice hidden';if(text)window.scrollTo(0,0);}
function show(screen){current=screen;for(const name of screens)$('screen'+name).classList.toggle('hidden',name!==screen);$('topnav').classList.toggle('hidden',!state);$('coachNavButton').classList.toggle('hidden',!state?.freeReport&&!state?.reportGenerated);$('testerTools').classList.toggle('hidden',!state);$('signedEmail').textContent=state?.email?`Verified as ${state.email}`:'';window.scrollTo({top:0,behavior:'instant'});}
function setFlow(next){flow=next;try{sessionStorage.setItem('buddy-v53-intent',next);}catch{}}
function isAssessmentPaid(){return state?.tier==='paid';}
function isCoachActive(){return Boolean(state?.freeReport||state?.reportGenerated)&&(state?.tier==='paid'||state?.tier==='coach');}
function goAssessment(){if(!state){show('Login');return;}if(!state.freeReport){show('Free');$('freeIntroNote').textContent=flow==='premium'?'Your premium journey starts with this free discovery. Your answers carry over automatically.':'These brief questions create your free career snapshot.';}else if(isAssessmentPaid())show(state.reportGenerated?'Toolkit':state.resumeDecision?'Paid':'Resume');else if(flow==='premium')show('Upgrade');else show('Snapshot');paint();}
function goCoach(){if(!state){show('Login');return;}if(!state.freeReport&&!state.reportGenerated){notice('Complete your free career discovery and snapshot first to activate Career Buddy.');show('Free');paint();return;}if(isCoachActive())show('Coach');else show('CoachOffer');paint();}
async function choose(next){setFlow(next);if(!state){show('Login');return;}await run(async()=>{state=(await api('setJourney',{journey:next})).state;notice('');goAssessment();});}
function paint(){if(!state)return;const s=current;
 if(s==='Free'||s==='Paid')paintQuestion(s==='Free');
 if(s==='Snapshot')paintSnapshot();
 if(s==='Resume')paintResume();
 if(s==='Toolkit')paintToolkit();
 if(s==='Coach')paintCoach();
 if(s==='Refills')$('refillBalance').textContent=`${state.credits||0} interactions remaining · Valid until ${new Date(state.expiresAt).toLocaleDateString('en-IN')}`;
 if(s==='Reports')paintReports();
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
 catch(e){notice(e.message,true);}
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
function paintQuestion(free){const name=free?'free':'paid',host=$(name+'Question'),guided=state.guided||{},q=guided.question;
 const progress=(guided.completed||0)/(guided.total||10);$(name+'Progress').style.width=`${Math.round(100*progress)}%`;$(name+'Counter').textContent=`${guided.completed||0} of ${guided.total||10} topics completed`;
 host.replaceChildren();if(!free&&(!state.resumeDecision)){host.append(el('p','','Your optional resume decision comes first.'));const b=el('button','primary','Continue to resume step');b.onclick=()=>show('Resume');host.append(b);return;}
 if(!q){const ready=free?state.freeReportReady:state.reportReady;host.append(el('h2','',free?'Your free screening is complete.':ready?'Your detailed report is ready to generate.':'A little more context is needed.'));
  host.append(el('p','muted',free?(state.freeReportReady?'Create your concise snapshot. You can download it now or at any time in My reports.':'A required area is incomplete. Please review the missing details before requesting a snapshot.'):ready?'Your initial detailed report is included and does not cost a chat interaction.':'You can use paid coaching to provide additional examples and clarify any missing areas.'));
  if(!ready){const missing=free?(state.freeReadiness?.missing||[]):(state.readiness?.missing||[]);if(missing.length)addList(host,'Information still needed',missing);}
  const button=el('button','primary',free?'Generate free snapshot →':ready?'Generate detailed report →':'Ask Career Buddy for guidance →');button.dataset.asyncAction='1';if(free)button.dataset.requiresFreeReady='1';button.onclick=()=>free?generateFree():ready?generateDetailed():goCoach();button.disabled=loading||(free&&!state.freeReportReady);host.append(button);return;}
 host.append(el('h2','',q.text));
 const choices=el('div','answers'),inputs=[];
 if(q.kind!=='text'){
  for(const op of q.options||[]){const row=el('label','answer');const input=document.createElement('input');input.type=q.kind==='multi'?'checkbox':'radio';input.name='answerOption';input.value=op;row.append(input,el('span','',op));choices.append(row);inputs.push(input);}
  host.append(choices);
 }
 let txt=null,other=null;
 if(q.kind==='text'){txt=el('textarea');txt.id='answerText';txt.maxLength=q.maxLength||300;txt.placeholder=q.placeholder||'A short answer is enough';txt.rows=3;host.append(txt,el('div','help-text',q.example?'A concrete work example is enough; numerical results are not required.':`Up to ${txt.maxLength} characters.`));}
 else {other=el('input');other.type='text';other.maxLength=120;other.placeholder='Please specify briefly';other.className='hidden';host.append(other);for(const input of inputs)input.onchange=()=>{other.classList.toggle('hidden',!inputs.some(x=>x.checked&&x.value==='Other'));};}
 const row=el('div','question-actions'),error=el('div','question-error');
 if(q.optional){const skip=el('button','secondary','Skip');skip.onclick=()=>sendQuick(q,true);row.append(skip);}else row.append(el('span','micro','Your answer is saved automatically.'));
 const submit=el('button','primary','Continue →');submit.onclick=()=>{let value=q.kind==='text'?txt.value.trim():q.kind==='multi'?inputs.filter(x=>x.checked).map(x=>x.value):(inputs.find(x=>x.checked)?.value||'');if(!value||Array.isArray(value)&&!value.length){error.textContent='Choose an answer to continue.';return;}if(q.kind==='multi'&&value.length<(q.minSelections||1)){error.textContent=`Choose at least ${q.minSelections||1} options.`;return;}sendQuick(q,false,value,other?.value?.trim()||'');};row.append(submit);host.append(row,error);
}
async function sendQuick(q,skip,value,other=''){await run(async()=>{const v=await api('quick',{questionId:q.id,skip,value,other,requestId:uuid()});state=v.state;notice('');paint();});}
function paintSnapshot(){const r=state.freeReport||{},view=$('snapshotSummary');view.replaceChildren();if(!state.freeReport){view.append(el('p','','Finish the free assessment first.'));return;}view.append(el('h3','','Your professional profile'),el('p','',r.profileSummary||''));addList(view,'Target role competencies',(r.targetCompetencies||[]));addList(view,'Five next steps',(r.nextSteps||[]));addList(view,'Areas needing further assessment',(r.furtherAssessment||[]));if((r.version||0)<2){const b=el('button','secondary','Update snapshot with more detail →');b.onclick=generateFree;view.append(b);}}
function paintResume(){const box=$('resumePaste');box.value=state?.resumeDecision==='provided'?'':box.value||'';$('resumeCount').textContent=`${box.value.length.toLocaleString()} / 12,000 characters`;}
function paintToolkit(){const provided=state.resumeSubmitted,revised=!!state.resumeRevision;$('resumeKitText').textContent=revised?'Your revised resume is ready. Review the facts before using it.':provided?'Your pasted resume can now be revised into an editable Word document and PDF.':'Resume review is optional. You can paste one later without repeating the detailed assessment.';$('buildResume').classList.toggle('hidden',!provided||revised);$('resumeDownloadRow').classList.toggle('hidden',!revised);$('resumeLater').classList.toggle('hidden',provided);$('remainingNote').textContent=`${state.credits||0} interactions remaining. Your reports will stay in My reports.`;}
function paintCoach(){
 const rem=Number(state.credits||0);
 $('coachCreditPill').textContent=`${rem} interaction${rem===1?'':'s'} left · Refill`;
 const warn=state.warning||((rem<=0)?'Your coaching credits are exhausted. Refill to continue; previous messages remain visible.':state.expired?'Your pack has expired. Refill to continue; previous messages remain visible.':'');
 $('creditWarning').classList.toggle('hidden',rem>10&&!state.expired&&!warn.trim());
 $('creditWarning').textContent=warn;
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
 if(state.freeReport)item('Free Career Snapshot','Your saved preliminary four-section assessment.',[['View',()=>openFree()],['Download PDF',()=>download('free','pdf')],...((state.freeReport.version||0)<2?[['Expand snapshot',()=>generateFree()]]:[])]);
 if(state.reportGenerated)item('Detailed Career Report','Role expectations, technical and behavioural skills, evidence-based development actions, 30/60/90 plan and 10 interview questions.',[['View',()=>openDetailed()],['Download PDF',()=>download('report','pdf')]]);
 if(state.resumeRevision)item('Revised Resume','Review the editable draft and confirm all facts before applying.',[['View',()=>openResume()],['Download Word',()=>download('resume','docx')],['Download PDF',()=>download('resume','pdf')]]);
 if(state.freeReport){const b=el('button','secondary','Continue with Career Buddy →');b.onclick=goCoach;host.append(b);}
 if(!state.freeReport&&!state.reportGenerated&&!state.resumeRevision)host.append(el('p','muted','Your reports will appear here after you generate them.'));
}
async function generateFree(){await run(async()=>{notice('Generating your short free snapshot…');state=(await api('freeReport',{requestId:uuid()})).state;notice('Your free snapshot is saved and ready to download.');show('Snapshot');paint();});}
async function activate(packId,couponId){await run(async()=>{const couponCode=$(couponId)?.value?.trim()||'';const out=await api('mockPurchase',{packId,couponCode,requestId:uuid()});state=out.state;notice(out.notice);if(packId==='starter'){setFlow('premium');show(state.resumeDecision?'Paid':'Resume');}else if(packId==='intro'){show('Coach');}else{show('Coach');}paint();});}
async function saveResume(skip){await run(async()=>{state=(await api('chooseResume',{skip,resumeText:skip?'':$('resumePaste').value})).state;notice(skip?'Resume skipped. You can return to it later.':'Resume saved securely for the detailed report.');if(state.reportGenerated)show('Toolkit');else show('Paid');paint();});}
async function generateDetailed(){await run(async()=>{notice('Generating your detailed career report and tailored interview questions…');state=(await api('report',{requestId:uuid()})).state;notice('Your report is saved. Unused coaching credits remain available.');show('Toolkit');paint();});}
async function buildResume(){await run(async()=>{notice('Creating an editable resume draft from your provided text…');state=(await api('generateResume',{requestId:uuid()})).state;notice('Resume ready. Review all details before using it.');show('Toolkit');paint();});}
async function submitChat(event){event.preventDefault();const input=$('chatInput'),message=input.value.trim();if(!message)return;await run(async()=>{if(message.length>1200)throw Error('Maximum 1,200 characters per message.');input.value='';$('chatCount').textContent='0 / 1,200 characters';const req=api('chat',{message,requestId:uuid()}); // Allow the user to see a waiting indicator without inventing a charged response.
 $('chatMessages').append(el('div','message','Career Buddy is thinking…'));try{state=(await req).state;notice('');paintCoach();}catch(e){input.value=message;paintCoach();throw e;}
 });}
function download(kind,format='pdf'){window.location.assign(`/api/service?action=download&kind=${encodeURIComponent(kind)}&format=${encodeURIComponent(format)}`);}
function openDialog(title){$('dialogTitle').textContent=title;$('reportContent').replaceChildren();$('reportDialog').showModal();return $('reportContent');}
function openFree(){if(!state.freeReport)return;reportKind='free';const r=state.freeReport,host=openDialog('Your Free Career Snapshot');host.append(el('h3','','1. Your professional profile'),el('p','',r.profileSummary||''));addList(host,'2. Target role competencies',r.targetCompetencies);addList(host,'3. Five general career actions',r.nextSteps);addList(host,'4. What we should assess next',r.furtherAssessment);if((r.version||0)<2)host.append(el('p','micro','An expanded snapshot is available on your Snapshot page.'));}
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
 host.append(el('p','micro','Guidance is based on your provided information, not independently validated skill scores.'));
}
function openResume(){if(!state.resumeRevision)return;reportKind='resume';const r=state.resumeRevision,host=openDialog('Revised Resume – review before use');host.append(el('h3','',r.headline),el('p','',r.summary));addList(host,'Core skills',r.coreSkills);for(const x of r.experience||[])addList(host,[x.role,x.employer,x.period].filter(Boolean).join(' · '),x.bullets);addList(host,'Education',r.education);addList(host,'Certifications',r.certifications);addList(host,'Facts to confirm',r.missingEvidence);}
async function init(){try{const config=await api('config');configured=!!config.configured;if(!configured)notice('The preview is not configured. Check the Vercel environment variables.',true);try{state=(await api('state')).state;}catch{} }catch(e){notice(e.message,true);}if(state){flow=state.journeyPreference||'free';goAssessment();}else show('Choose');}
$('chooseAssessment').onclick=()=>choose('free');$('choosePremium').onclick=()=>choose('premium');$('backToChoice').onclick=()=>show('Choose');$('homeButton').onclick=()=>show('Choose');$('myReportsButton').onclick=()=>{show('Reports');paint();};$('coachNavButton').onclick=goCoach;$('signOutButton').onclick=async()=>{await run(async()=>{await api('logout',{});state=null;notice('Signed out. Verify your email to resume later.');show('Choose');});};
$('loginForm').onsubmit=async e=>{e.preventDefault();await run(async()=>{if(!configured)throw Error('The preview services are not configured.');await api('requestCode',{email:$('emailAddress').value.trim(),previewCode:$('accessCode').value});$('loginForm').classList.add('hidden');$('verifyForm').classList.remove('hidden');$('authHelp').textContent='Code sent. Check your email and enter the six digits below.';});};
$('verifyForm').onsubmit=async e=>{e.preventDefault();await run(async()=>{state=(await api('verifyCode',{email:$('emailAddress').value.trim(),previewCode:$('accessCode').value,code:$('otpCode').value.trim()})).state;notice('Email verified. Your progress is saved.');state=(await api('setJourney',{journey:flow==='premium'?'premium':'free'})).state;goAssessment();});};
$('snapshotDownload').onclick=()=>download('free');$('snapshotView').onclick=openFree;$('snapshotUpgrade').onclick=async()=>{await choose('premium');};$('snapshotCoach').onclick=goCoach;$('backSnapshot').onclick=()=>{show('Snapshot');paint();};$('activateStarter').onclick=()=>activate('starter','starterCoupon');$('activateIntro').onclick=()=>activate('intro','introCoupon');$('saveResume').onclick=()=>saveResume(false);$('skipResume').onclick=()=>saveResume(true);$('resumePaste').oninput=()=>{$('resumeCount').textContent=`${$('resumePaste').value.length.toLocaleString()} / 12,000 characters`;};
$('viewDetailed').onclick=openDetailed;$('downloadDetailed').onclick=()=>download('report');$('buildResume').onclick=buildResume;$('downloadDocx').onclick=()=>download('resume','docx');$('downloadResumePdf').onclick=()=>download('resume');$('resumeLater').onclick=()=>{show('Resume');paint();};$('toolkitCoach').onclick=goCoach;
$('coachCreditPill').onclick=()=>{show('Refills');paint();};
for(const button of document.querySelectorAll('[data-coach-prompt]')){
 button.onclick=()=>{const input=$('chatInput');if(input.disabled)return;input.value=button.dataset.coachPrompt;input.dispatchEvent(new Event('input'));input.focus();input.scrollIntoView({block:'center',behavior:'smooth'});};
}
$('chatForm').onsubmit=submitChat;$('chatInput').oninput=()=>{$('chatCount').textContent=`${$('chatInput').value.length.toLocaleString()} / 1,200 characters`;};$('chatInput').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('chatForm').requestSubmit();}};
$('buyStandard').onclick=()=>activate('standard','refillCoupon');$('buyExtended').onclick=()=>activate('extended','refillCoupon');$('refillBack').onclick=goCoach;
$('resetSession').onclick=async()=>{const ownerCode=prompt('Owner-only reset: enter the OWNER_RESET_CODE.');if(!ownerCode)return;await run(async()=>{state=(await api('ownerReset',{ownerCode})).state;notice('Test session reset. Your API usage logs remain available.');setFlow('free');goAssessment();});};
$('closeDialog').onclick=$('dialogDone').onclick=()=>$('reportDialog').close();$('dialogDownload').onclick=()=>download(reportKind==='resume'?'resume':reportKind,reportKind==='resume'?'docx':'pdf');
init();
