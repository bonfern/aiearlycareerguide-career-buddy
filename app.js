const $=id=>document.getElementById(id);
let state=null,loading=false,configured=false,mode='quick',quickLoading=false,showTopups=false;
const msg=$('userMessage'),composer=$('composer');
async function api(action,data){
 const response=await fetch(`/api/service?action=${encodeURIComponent(action)}`,{method:data?'POST':'GET',credentials:'same-origin',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined});
 let value={};try{value=await response.json();}catch{}
 if(!response.ok)throw new Error(value.error||`Request failed: ${response.status}`);
 return value;
}
function notice(text='',error=false){const n=$('notice');n.textContent=text;n.className=text?`notice${error?' error':''}`:'notice hidden';}
function el(tag,cls,text){const a=document.createElement(tag);if(cls)a.className=cls;if(text!==undefined)a.textContent=String(text);return a;}
function renderMessages(){
 const view=$('chatMessages');view.replaceChildren();
 const messages=state?.messages||[];
 if(!messages.length){view.append(el('div','empty-message','Your conversation will appear here.'));return;}
 for(const m of messages){const wrap=el('div',`msg ${m.role==='user'?'user':'assistant'}`);wrap.append(el('span','msg-label',m.role==='user'?'YOU':'CAREER BUDDY'));wrap.append(el('div','bubble',m.content));view.append(wrap);}
 if(loading){const w=el('div','msg thinking');w.append(el('div','bubble','Career Buddy is thinking…'));view.append(w);}
 view.scrollTop=view.scrollHeight;
}
function safeDate(d){const date=new Date(d);return Number.isFinite(date.getTime())?date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—';}
function render(){
 if(!state)return;
 const paid=state.tier==='paid';
 $('signIn').classList.add('hidden');document.querySelector('.side').classList.remove('hidden');$('modeTabs').classList.remove('hidden');$('ownerTools').classList.remove('hidden');$('signedEmail').textContent=state.email||'';
 const remaining=Number(state.credits||0),total=Number(state.creditsGranted||0);
 $('packageEyebrow').textContent=paid?'YOUR TEST COACHING PACKAGE':'YOUR FREE CAREER SNAPSHOT';
 $('packageName').textContent=paid?'Career Buddy Starter':'Career Snapshot';
 $('packagePrice').textContent=paid?'From ₹499*':'Free';
 $('creditCount').replaceChildren(document.createTextNode(paid?`${remaining} `:'Free '),el('span','',paid?`of ${total} test interactions left`:'· no coaching credits required'));
 $('creditBar').style.width=paid?`${Math.round(100*remaining/Math.max(total,1))}%`:'100%';
 $('expiryDate').textContent=paid?`Test pack valid until ${safeDate(state.expiresAt)}`:'Free snapshot available once your screening is complete';
 let expiryWarning='';const days=(new Date(state.expiresAt).getTime()-Date.now())/86400000;
 if(paid&&days<=0)expiryWarning='Test pack expired. Your reports and chat history remain accessible.';
 else if(paid&&days<=7)expiryWarning=`Test pack expires in ${Math.max(1,Math.ceil(days))} day(s).`;
 const warning=[state.warning,expiryWarning].filter(Boolean).join(' ');
 $('creditWarning').classList.toggle('hidden',!warning);$('creditWarning').textContent=warning;
 const readiness=paid?state.readiness:state.freeReadiness;
 $('progressHeading').textContent=paid?'Detailed career profile coverage':'Free career screening coverage';
 $('progressText').textContent=`${readiness.completed} / ${readiness.total}`;
 $('progressBar').style.width=`${Math.round(100*readiness.completed/Math.max(readiness.total,1))}%`;
 $('missingTopics').replaceChildren();
 if(readiness.ready)$('missingTopics').append(el('span','topic',paid?'Ready for the full report.':'Ready for your free snapshot.'));
 else for(const t of readiness.missing)$('missingTopics').append(el('span','topic',t));
 $('freeReportState').textContent=state.freeReport?'Generated':state.freeReportReady?'Ready':'Locked';
 $('freeReportText').textContent=state.freeReport?'Your concise preliminary report is saved. It remains available after upgrading.':state.freeReportReady?'Your free discovery is complete. Generate a concise preliminary report now.':'Answer the guided questions to unlock a short summary, target-role competencies, five general next steps and further assessment needs.';
 $('generateFreeReport').classList.toggle('hidden',!!state.freeReport||paid);
 $('generateFreeReport').disabled=!state.freeReportReady||!!state.freeReport||loading;
 $('viewFreeReport').classList.toggle('hidden',!state.freeReport);
 $('statusPanel').classList.toggle('hidden',!paid);
 $('profilePanel').classList.toggle('hidden',!paid||state.reportGenerated);
 $('freePanel').classList.toggle('hidden',paid);
 $('purchasePanel').classList.toggle('hidden',paid||!state.freeReport);
 $('refillPanel').classList.toggle('hidden',!paid||(!showTopups&&remaining>10));
 $('paidReportPanel').classList.toggle('hidden',!paid);
 $('toolkitPanel').classList.toggle('hidden',!paid||!state.reportGenerated);
 $('resumeStep').classList.toggle('hidden',!paid||(!state.readiness?.ready&&(!state.reportGenerated||state.resumeDecision))||state.resumeSubmitted);
 $('resumeSaved').textContent=state.resumeDecision==='skip'?'Resume skipped. You can still generate your full report.':state.resumeSubmitted?'Resume text saved for analysis.':'Choose paste or skip before report generation.';
 const generated=state.reportGenerated,ready=state.reportReady;
 $('downloadReport').classList.toggle('hidden',!generated);
 $('resumeDownloads').classList.toggle('hidden',!state.resumeRevision);
 $('reportState').textContent=generated?'Generated':ready?'Ready':'Locked';
 $('reportText').textContent=generated?'Your report is complete. You may continue coaching with unused valid credits.':ready?'Your profile and optional resume decision are complete. Generate the included report.':state.readiness?.ready?'Choose whether to paste your resume or skip before generating your report.':'Complete the remaining targeted questions to unlock your detailed report.';
 $('generateReport').classList.toggle('hidden',generated);
 $('generateReport').disabled=!ready||generated||state.expired||loading;
 $('viewReport').classList.toggle('hidden',!generated);
 $('openResume').textContent=state.resumeRevision?'View revised resume':'Generate revised resume';
 $('openResume').disabled=!state.resumeSubmitted;
 $('openInterview').textContent='View interview questions';
 const u=state.usageSummary||{};
 $('usageText').textContent=u.calls?`${Number(u.calls).toLocaleString()} calls · ${Number(u.inputTokens||0).toLocaleString()} input / ${Number(u.outputTokens||0).toLocaleString()} output tokens${u.unpricedCalls?' · model pricing not configured':` · ₹${Number(u.inrCost||0).toFixed(3)} estimated`}`:'No AI calls yet';
 const canChat=paid&&!state.expired&&remaining>0&&!loading;
 msg.disabled=!canChat;$('sendButton').disabled=!canChat;
 $('chatStatus').textContent=!paid?'Free career discovery':state.expired?'Access expired':remaining?'Test coaching session':'Credits exhausted';
 msg.placeholder=!paid?'Generate the free snapshot and activate the Starter test pack to chat':!canChat?'No available chat credits or access expired':'Ask a specific career question or paste one resume bullet for feedback…';
 $('guidedHeading').textContent=paid?'Deepen your career assessment':'Your free career discovery';
 $('guidedDescription').textContent=paid?'Just a few extra questions. Everything from your free assessment is already saved.':'Up to ten short questions for your free preliminary Career Snapshot.';
 renderMode();renderMessages();
}
function switchMode(next){
 if(next==='chat'&&state?.tier!=='paid'){notice('Free chat begins after the Career Snapshot and Starter test activation. Your answers are saved.');return;}
 mode=next==='chat'?'chat':'quick';
 if(state)renderMode();
}
function renderMode(){
 const quick=mode==='quick';
 $('modeQuick').classList.toggle('selected',quick);$('modeChat').classList.toggle('selected',!quick);
 $('modeQuick').setAttribute('aria-pressed',String(quick));$('modeChat').setAttribute('aria-pressed',String(!quick));
 $('guidedPanel').classList.toggle('hidden',!quick);$('chatMessages').classList.toggle('hidden',quick);
 $('chatModeHint').classList.toggle('hidden',quick);composer.classList.toggle('hidden',quick);
 if(quick)renderQuick();
}
function updateOther(){
 const q=state?.guided?.question;if(!q||q.kind==='text')return;
 const selected=[...$('quickOptionList').querySelectorAll('input:checked')].map(x=>x.value);
 $('quickOtherWrap').classList.toggle('hidden',!selected.includes('Other'));
}
function renderQuick(){
 const guided=state.guided||{completed:0,total:13,question:null,finished:false},q=guided.question;
 $('quickProgressText').textContent=`${guided.completed} of ${guided.total} topics explored`;
 $('quickProgressBar').style.width=`${Math.round(100*guided.completed/Math.max(1,guided.total))}%`;
 const h=$('quickHistory');h.replaceChildren();
 for(const item of state.quickHistory||[]){
  const line=el('div','quick-history-row');line.append(el('strong','', 'YOU'),el('span','',item.answer||''));h.append(line);
 }
 $('quickQuestionWrap').classList.toggle('hidden',!q);
 $('quickDone').classList.toggle('hidden',!!q);
 if(!q){
  const done=$('quickDone');done.replaceChildren();
  const free=state.tier!=='paid';
  done.append(el('strong','',free?'Your free discovery is complete.':state.readiness?.ready?'Your career profile is ready for the detailed report.':'Your additional paid questions are complete.'));
  done.append(el('p','',free?(state.freeReport?'Your free Career Snapshot is ready. Review it and activate the Starter preview to continue.':'Generate your free Career Snapshot from the report section. No payment is needed.'):(state.readiness?.ready?'You can request the included detailed report without spending a chat credit.':'Some evidence may need clarification. Use Ask Career Buddy to fill missing report topics.')));
  const b=el('button','outline',free?'View Career Snapshot':'Ask Career Buddy');b.type='button';b.disabled=free&&!state.freeReport;b.addEventListener('click',()=>free?openFreeReport():switchMode('chat'));done.append(b);
  return;
 }
 $('quickPrompt').textContent=q.text;
 $('quickError').textContent='';
 const choices=$('quickOptionList');choices.replaceChildren();
 const textMode=q.kind==='text';
 $('quickTextWrap').classList.toggle('hidden',!textMode);
 $('quickOptionList').classList.toggle('hidden',textMode);
 $('quickOtherWrap').classList.add('hidden');$('quickOther').value='';
 $('quickText').value='';$('quickText').maxLength=q.maxLength||300;
 $('quickText').placeholder=q.placeholder||'Short response';
 $('quickCount').textContent=`0 / ${q.maxLength||300} characters`;
 $('quickHelp').classList.toggle('hidden',!q.example);
 $('quickSkip').classList.toggle('hidden',!q.optional);
 const dis=quickLoading||loading||(state.tier==='paid'&&(state.expired||state.credits<=0));
 $('quickSubmit').disabled=dis;$('quickSkip').disabled=dis;
 if(!textMode){
  for(const op of q.options){
   const label=el('label','choice-option');const input=document.createElement('input');input.type=q.kind==='multi'?'checkbox':'radio';input.name='quickChoice';input.value=op;input.disabled=dis;
   input.addEventListener('change',()=>{
    if(q.kind==='multi'){
     const selected=choices.querySelectorAll('input:checked');
     if(selected.length>(q.maxSelections||4)){input.checked=false;$('quickError').textContent=`Select up to ${q.maxSelections} options.`;}
     else $('quickError').textContent='';
    }
    updateOther();
   });
   label.append(input,el('span','',op));choices.append(label);
  }
 }
}
async function submitQuick(skip=false){
 if(!state||loading||quickLoading)return;
 const q=state.guided?.question;if(!q)return;
 if(state.tier==='paid'&&(state.expired||state.credits<=0)){notice('Test coaching credits exhausted or access expired. Your answers remain saved.',true);return;}
 const selected=[...$('quickOptionList').querySelectorAll('input:checked')].map(x=>x.value);
 let value=q.kind==='text'?$('quickText').value.trim():q.kind==='multi'?selected:selected[0];
 const other=$('quickOther').value.trim();
 if(!skip){
  if(q.kind==='text'&&value.length<q.minLength){$('quickError').textContent=q.example?`Please briefly name the work or project (at least ${q.minLength} characters).`:'Please enter a short job title.';return;}
  if(q.kind!=='text'&&selected.length<(q.minSelections||1)){$('quickError').textContent=`Choose ${q.minSelections||1} or more options.`;return;}
  if(selected.includes('Other')&&other.length<2){$('quickError').textContent='Please add a short description for Other.';return;}
 }
 quickLoading=true;let success=false;$('quickSubmit').disabled=true;$('quickSkip').disabled=true;$('quickError').textContent='Saving…';
 try{
  const response=await api('quick',{questionId:q.id,value,other,skip,requestId:crypto.randomUUID()});
  state=response.state;success=true;notice('');render();
 }catch(e){$('quickError').textContent=e.message;notice(e.message,true);}
 finally{quickLoading=false;if(state){if(success)renderQuick();else {const disabled=(state.tier==='paid'&&(state.expired||state.credits<=0))||loading;$('quickSubmit').disabled=disabled;$('quickSkip').disabled=disabled;}}}
}
$('modeQuick').addEventListener('click',()=>switchMode('quick'));
$('modeChat').addEventListener('click',()=>switchMode('chat'));
$('quickToChat').addEventListener('click',()=>switchMode('chat'));
$('chatToQuick').addEventListener('click',()=>switchMode('quick'));
$('quickSubmit').addEventListener('click',()=>submitQuick(false));
$('quickSkip').addEventListener('click',()=>submitQuick(true));
$('quickText').addEventListener('input',()=>{ $('quickError').textContent='';
 $('quickCount').textContent=`${$('quickText').value.length} / ${state?.guided?.question?.maxLength||300} characters`;
});
$('quickText').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitQuick(false);}});
function showSignIn(message=''){document.querySelector('.side').classList.add('hidden');$('signIn').classList.remove('hidden');$('modeTabs').classList.add('hidden');$('guidedPanel').classList.add('hidden');$('chatModeHint').classList.add('hidden');composer.classList.add('hidden');$('ownerTools').classList.add('hidden');$('chatMessages').replaceChildren();$('setupInfo').textContent=message;}
async function init(){
 try{
  const config=await api('config');configured=config.configured;
  if(!configured){showSignIn('Set up Resend verification, Firebase and OpenAI in the new Career Buddy Vercel project.');$('startButton').disabled=true;return;}
  try{state=(await api('state')).state;render();}
  catch{showSignIn('Enter your email and private access code. A six-digit verification code will be sent to you.');}
 }catch{showSignIn('The independent Career Buddy backend is unavailable. Check the Vercel deployment.');$('startButton').disabled=true;}
}
$('startButton').addEventListener('click',async()=>{
 if(!configured)return;const email=$('emailAddress').value.trim(),previewCode=$('accessCode').value;
 $('startButton').disabled=true;
 try{await api('requestCode',{email,previewCode});$('verifyBox').classList.remove('hidden');$('setupInfo').textContent='Verification email sent. Code valid for 10 minutes.';}
 catch(e){$('setupInfo').textContent=e.message;}finally{$('startButton').disabled=false;}
});
$('verifyButton').addEventListener('click',async()=>{
 $('verifyButton').disabled=true;
 try{state=(await api('verifyCode',{email:$('emailAddress').value,previewCode:$('accessCode').value,code:$('otpCode').value})).state;notice('Email verified. Your previous answers have been restored.');render();}
 catch(e){$('setupInfo').textContent=e.message;}finally{$('verifyButton').disabled=false;}
});
$('toggleRefills').addEventListener('click',()=>{showTopups=!showTopups;if(state)render();});
$('signOut').addEventListener('click',async()=>{try{await api('logout',{});}finally{state=null;showSignIn('You are signed out. Verify your email to resume.');}});
$('ownerReset').addEventListener('click',async()=>{
 const ownerCode=window.prompt('Owner reset only: enter OWNER_RESET_CODE to clear test answers for this email.');if(!ownerCode)return;
 if(!window.confirm('Clear this verified email’s test progress and test credits? Previous usage logs remain.'))return;
 try{state=(await api('ownerReset',{ownerCode})).state;notice('Test session reset. Begin again.');mode='quick';render();}
 catch(e){notice(e.message,true);}
});
msg.addEventListener('input',()=>{$('charCount').textContent=`${msg.value.length.toLocaleString()} / 1,200 characters`;$('charCount').style.color=msg.value.length>=1000?'#a45100':'';});
msg.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();composer.requestSubmit();}});
composer.addEventListener('submit',async e=>{
 e.preventDefault();if(loading||!state)return;
 const message=msg.value.trim();if(!message)return;
 if(message.length>1200){notice('The message exceeds 1,200 characters.',true);return;}
 loading=true;notice('');render();
 try{state=(await api('chat',{message,requestId:crypto.randomUUID()})).state;msg.value='';msg.dispatchEvent(new Event('input'));}
 catch(e){notice(e.message,true);}
 finally{loading=false;render();}
});
$('generateFreeReport').addEventListener('click',async()=>{
 if(!state?.freeReportReady||state.freeReport||loading)return;
 loading=true;render();notice('Generating your concise free Career Snapshot…');
 try{state=(await api('freeReport',{requestId:crypto.randomUUID()})).state;notice('Free Career Snapshot saved. All answers will carry over to paid coaching.');render();openFreeReport();}
 catch(e){notice(e.message,true);}
 finally{loading=false;render();}
});
async function previewPurchase(packId,inputId){
 if(loading)return;
 const couponCode=$(inputId).value.trim();
 if(!window.confirm(`Simulate ${packId} credit activation? No real payment will be collected.`))return;
 loading=true;notice('Simulating a TEST pack activation—no payment is collected.');
 try{const v=await api('mockPurchase',{packId,couponCode,requestId:crypto.randomUUID()});state=v.state;notice(v.notice);if(state.tier==='paid')switchMode('quick');render();}
 catch(e){notice(e.message,true);}
 finally{loading=false;render();}
}
$('activateStarter').addEventListener('click',()=>previewPurchase('starter','couponCode'));
$('refillStandard').addEventListener('click',()=>previewPurchase('standard','refillCoupon'));
$('refillExtended').addEventListener('click',()=>previewPurchase('extended','refillCoupon'));
function modal(title){$('dialogTitle').textContent=title;const root=$('reportContent');root.replaceChildren();return root;}
function openFreeReport(){
 const r=state?.freeReport;if(!r)return;
 const root=modal('Your Free Career Snapshot');root.append(el('h3','','1. Your professional profile'),el('p','',r.profileSummary));
 section(root,'2. Competencies needed for your target role',r.targetCompetencies);
 section(root,'3. Five practical next steps',r.nextSteps);
 section(root,'4. What we need to assess further',r.furtherAssessment);
 root.append(el('div','report-warning','This free report is preliminary guidance only. It does not evaluate or certify your actual competency gaps. Upgrade to Career Buddy for an evidence-based development report and personalised coaching.'));
 $('reportDialog').showModal();
}
function openResume(){
 const r=state?.resumeRevision;if(!r)return;
 const root=modal('Your Revised Resume · Review Before Use');root.append(el('h3','',r.headline),el('p','',r.summary));
 section(root,'Core skills',r.coreSkills);
 for(const job of r.experience||[]){root.append(el('h3','',[job.role,job.employer,job.period].filter(Boolean).join(' · ')));section(root,'Suggested responsibilities and achievements',job.bullets);}
 section(root,'Education',r.education);section(root,'Certifications',r.certifications);
 section(root,'Recommended resume improvements',r.improvements);section(root,'Check these details before applying',r.missingEvidence);
 root.append(el('p','small-muted','Your resume is an editable draft based only on supplied text. Check all content before sharing.'));
 $('reportDialog').showModal();
}
function openInterview(){
 const r=state?.report;if(!r)return;
 const root=modal('Interview Preparation · '+(state?.report?.targetRole||'Your target role'));
 for(const [i,q] of (r.interviewPreparation||[]).entries()){
  const item=el('div','toolkit-item');item.append(el('strong','',`${i+1}. ${q.question}`),el('p','',`Competency: ${q.competency}`),el('p','',`What interviewers assess: ${q.whatEvaluated}`),el('p','',`Suggested framework: ${q.answerFramework}`));root.append(item);
 }root.append(el('p','small-muted','Illustrative preparation questions, not guaranteed employer interview questions.'));$('reportDialog').showModal();
}
$('openResume').addEventListener('click',async()=>{
 if(!state?.reportGenerated||!state?.resumeSubmitted)return;
 if(state.resumeRevision){openResume();return;}
 loading=true;render();notice('Building your revised resume from the text you pasted…');
 try{state=(await api('generateResume',{requestId:crypto.randomUUID()})).state;notice('Resume draft generated. Please review the details before using it.');render();openResume();}
 catch(e){notice(e.message,true);}finally{loading=false;render();}
});
$('openInterview').addEventListener('click',openInterview);
$('resumePaste').addEventListener('input',()=>{$('resumeCount').textContent=`${$('resumePaste').value.length.toLocaleString()} / 12,000 characters`;});
async function chooseResume(skip){
 loading=true;render();
 try{state=(await api('chooseResume',{skip,resumeText:skip?'':$('resumePaste').value})).state;notice(skip?'Resume skipped. Full report remains available.':'Resume securely saved for your paid report.');render();}
 catch(e){notice(e.message,true);}finally{loading=false;render();}
}
$('saveResume').addEventListener('click',()=>chooseResume(false));$('skipResume').addEventListener('click',()=>chooseResume(true));
function download(kind,format){window.location.assign(`/api/service?action=download&kind=${encodeURIComponent(kind)}&format=${encodeURIComponent(format)}`);}
$('downloadReport').addEventListener('click',()=>download('report','pdf'));
$('downloadResumeDocx').addEventListener('click',()=>download('resume','docx'));
$('downloadResumePdf').addEventListener('click',()=>download('resume','pdf'));
$('viewFreeReport').addEventListener('click',openFreeReport);
$('generateReport').addEventListener('click',async()=>{
 if(!state?.reportReady||loading)return;
 if(!window.confirm('Generate your included career report now? This will not consume your remaining chat credits.'))return;
 loading=true;render();notice('Generating your personalised report. Please wait…');
 try{state=(await api('report',{requestId:crypto.randomUUID()})).state;notice('Report created. All unused chat credits are still available.');render();openReport();}
 catch(e){notice(e.message,true);}
 finally{loading=false;render();}
});
function section(parent,title,items){if(!Array.isArray(items)||!items.length)return;parent.append(el('h3','',title));const ul=el('ul');for(const i of items)ul.append(el('li','',i));parent.append(ul);}
function openReport(){
 const r=state?.report;if(!r)return;
 const root=modal('Career Action & Skill Development Report');
 root.append(el('h3','report-hdr','Your career summary and goal'),el('p','',r.summary),el('h3','','Your goal'),el('p','',r.goalPath?.headline||''));
 for(const [name,items] of [['Technical capability priorities',r.capabilityFocus?.technical],['Leadership and behavioural priorities',r.capabilityFocus?.behavioural]]){
  root.append(el('h3','report-section',name));for(const x of items||[])root.append(el('p','',`${x.name} — ${x.currentCompetency} | ${x.status}. Next step: ${x.firstAction}`));
 }
 root.append(el('h3','report-section','How to get there'));
 for(const [i,x] of (r.goalPath?.careerActions||[]).entries())root.append(el('h4','',`${i+1}. ${x.title}`),el('p','',x.action),el('p','small-muted','Desired outcome: '+x.outcome));
 root.append(el('h3','report-section','Skill-by-skill development plan'));
 for(const s of r.skillAssessments||[]){const div=el('div','skills-card');div.append(el('h4','',s.name),el('p','',`Role expectation: ${s.targetBenchmark}`),el('p','',`Current evidence: ${s.currentCompetency}`),el('p','',`Development need: ${s.gap}`));section(div,'Actions',s.actions);div.append(el('p','',`Evidence task: ${s.practiceTask}`),el('p','',`Success indicator: ${s.successIndicator}`));root.append(div);}
 root.append(el('h3','report-section','Other capabilities requiring assessment'));
 for(const x of r.additionalSkills||[])root.append(el('h4','',x.name),el('p','',x.expectation),el('p','',`Build: ${x.nextStep}`),el('p','',`Verify: ${x.howToVerify}`));
 root.append(el('h3','report-section','30 / 60 / 90-day execution plan'));
 for(const x of r.actionPlan||[]){root.append(el('h4','',`${x.period}: ${x.focus}`));section(root,'Actions',x.actions);}
 root.append(el('h3','report-section','Progress and evidence checklist'));
 for(const x of r.progressChecklist||[])root.append(el('p','',`${x.skill}: ${x.deliverable} · Evidence: ${x.evidence}`));
 section(root,'Learning and development options',[...(r.learningGuidance?.free||[]),...(r.learningGuidance?.paid||[]),...(r.learningGuidance?.certifications||[])]);
 root.append(el('h3','report-section','Interview preparation (10 questions)'));
 for(const [i,q] of (r.interviewPreparation||[]).entries())root.append(el('h4','',`${i+1}. ${q.question}`),el('p','',`Evaluated: ${q.whatEvaluated}`),el('p','',`Answer approach: ${q.answerFramework}`));
 root.append(el('h3','report-section','Resume analysis'));
 if(r.resumeReview?.status==='provided'){section(root,'Recommended changes',r.resumeReview.changes);section(root,'Details to verify',r.resumeReview.missingEvidence);}
 else root.append(el('p','','Resume skipped. Your full career report is ready. You can paste a resume later if you want a revised document.'));
 root.append(el('p','small-muted','This guidance uses self-reported facts; it is not a validated competency test. Interview questions are illustrative.'));
 $('reportDialog').showModal();
}
$('viewReport').addEventListener('click',openReport);
$('closeReport').addEventListener('click',()=>$('reportDialog').close());
$('doneReport').addEventListener('click',()=>$('reportDialog').close());
$('printReport').addEventListener('click',()=>state?.reportGenerated?download('report','pdf'):window.print());
init();
