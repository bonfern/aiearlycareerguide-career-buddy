const $=id=>document.getElementById(id);
let state=null,loading=false,configured=false;
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
 $('signIn').classList.add('hidden');composer.classList.remove('hidden');
 const remaining=Number(state.credits||0),total=Number(state.creditsGranted||60);
 $('creditCount').replaceChildren(document.createTextNode(String(remaining)+' '),el('span','',`of ${total} test interactions left`));
 $('creditBar').style.width=`${Math.round(Math.min(100,remaining/Math.max(total,1)*100))}%`;
 $('expiryDate').textContent=`Test pack valid until ${safeDate(state.expiresAt)}`;
 let expiryWarning='';const days=(new Date(state.expiresAt).getTime()-Date.now())/86400000;
 if(days<=0)expiryWarning='This preview access period has expired. Chat is read-only.';
 else if(days<=7)expiryWarning=`Test access expires in ${Math.max(1,Math.ceil(days))} day(s).`;
 const warning=[state.warning,expiryWarning].filter(Boolean).join(' ');
 $('creditWarning').classList.toggle('hidden',!warning);$('creditWarning').textContent=warning;
 const readiness=state.readiness||{ready:false,missing:[],completed:0,total:8};
 $('progressText').textContent=`${readiness.completed} / ${readiness.total}`;
 $('progressBar').style.width=`${Math.round(readiness.completed/8*100)}%`;
 $('missingTopics').replaceChildren();
 if(readiness.ready)$('missingTopics').append(el('span','topic','All essential topics covered.'));
 else for(const t of readiness.missing)$('missingTopics').append(el('span','topic',t));
 const generated=state.reportGenerated,ready=readiness.ready;
 $('reportState').textContent=generated?'Generated':ready?'Ready':'Locked';
 $('reportText').textContent=generated?'Your report is ready. Continue chatting with any remaining credits.':ready?'You now have enough documented context to request your personalised report.':'Keep chatting. You can generate the report once enough career context has been collected.';
 $('generateReport').classList.toggle('hidden',generated);
 $('generateReport').disabled=!ready||generated||state.expired||loading;
 $('viewReport').classList.toggle('hidden',!generated);
 const u=state.usageSummary||{};
 $('usageText').textContent=u.calls?`${Number(u.calls).toLocaleString()} calls · ${Number(u.inputTokens||0).toLocaleString()} in / ${Number(u.outputTokens||0).toLocaleString()} out tokens${u.unpricedCalls?' · pricing not configured':` · ₹${Number(u.inrCost||0).toFixed(3)}`}`:'No AI calls yet';
 const canChat=!state.expired&&remaining>0&&!loading;
 msg.disabled=!canChat;$('sendButton').disabled=!canChat;
 $('chatStatus').textContent=state.expired?'Access expired':remaining?'Private coaching session':'Credits exhausted';
 if(!canChat)msg.placeholder=state.expired?'Test access expired — read-only':!remaining?'Test credits used — read-only':'Processing…';
 else msg.placeholder='Share your career goal, experience or question…';
 renderMessages();
}
function showSignIn(message=''){$('signIn').classList.remove('hidden');composer.classList.add('hidden');$('chatMessages').replaceChildren(el('div','empty-message','Your Career Buddy conversation will appear here.'));$('setupInfo').textContent=message;}
async function init(){
 try{
  const config=await api('config');configured=config.configured;
  if(!configured){showSignIn('Setup required: configure a separate Firebase project and the preview environment variables listed in README.md.');$('startButton').disabled=true;return;}
  try{state=(await api('state')).state;render();}
  catch{showSignIn('Enter the private access code that you set in your new Vercel project.');}
 }catch(e){showSignIn('The backend has not been deployed yet. Upload the full code package to your new repository and deploy on Vercel.');$('startButton').disabled=true;}
}
$('startButton').addEventListener('click',async()=>{
 if(!configured)return;
 const code=$('accessCode').value;if(!code){$('setupInfo').textContent='Enter the private preview code.';return;}
 $('startButton').disabled=true;
 try{state=(await api('start',{code})).state;notice('Owner preview only. These are test credits, not a purchase.');render();}
 catch(e){$('setupInfo').textContent=e.message;}
 finally{$('startButton').disabled=false;}
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
 const root=$('reportContent');root.replaceChildren();root.append(el('h3','','Career summary'),el('p','',r.summary));
 section(root,'Self-reported strengths',r.strengths);section(root,'Path to your target role',r.roleSteps);
 if(r.requiredSkills?.length){root.append(el('h3','','Important skills for your target role'));for(const item of r.requiredSkills)root.append(el('p','',`${item.name}: ${item.expectation}`));}
 if(r.skillGaps?.length){root.append(el('h3','','Development priorities'));for(const item of r.skillGaps){root.append(el('p','',`${item.name}: ${item.explanation}`));section(root,'Recommended actions',item.actions);}}
 section(root,'Capabilities to validate further',r.untestedSkills);
 if(r.actionPlan?.length){root.append(el('h3','','Your 30 / 60 / 90 day plan'));for(const item of r.actionPlan){root.append(el('h3','',item.period+': '+item.focus));section(root,'Actions',item.actions);}}
 root.append(el('p','small-muted',r.note||'Guidance based on user-provided information. Skills have not been independently verified.'));
 $('reportDialog').showModal();
}
$('viewReport').addEventListener('click',openReport);
$('closeReport').addEventListener('click',()=>$('reportDialog').close());
$('doneReport').addEventListener('click',()=>$('reportDialog').close());
$('printReport').addEventListener('click',()=>window.print());
init();
