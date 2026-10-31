"""V5.30 browser regressions (mocked APIs; no live billing or AI calls)."""
from pathlib import Path
import re,base64,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 html=html.replace('src="./'+asset+'"',f'src="{data}"')
 css=css.replace("url('./"+asset+"')",f"url('{data}')")
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"\s*/>','<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"\s*></script>','',html)
seed={
 'id':'customer-v530','email':'customer@example.org','tier':'paid','mode':'public-live','journeyPreference':'premium','credits':12,'creditsGranted':40,
 'freeReport':{'version':6,'profileSummary':'Career path'},'reportGenerated':True,'report':{'summary':'Example'},
 'profile':{'currentRole':'Transformation Manager','targetRole':'Director of Transformation'},
 'messages':[],'resumeReviews':[], 'assessment':{'total':12,'answered':12,'finished':True},'expiresAt':'2027-12-01T10:00:00Z',
}
mock='''<script>
window.__mockState=SEED;window.__charges={chat:0,resume:0};window.__reqs=new Set();window.__mockFailures={chat:0,resume:0};
window.fetch=async(url,init={})=>{
 const action=new URL(url,'https://example.org').searchParams.get('action');
 const body=init.body?JSON.parse(init.body):{};
 const ok=x=>({ok:true,status:200,json:async()=>x});
 if(action==='config')return ok({configured:true,privatePreview:false,paymentMode:'razorpay_live'});
 if(action==='state'||action==='setJourney')return ok({state:window.__mockState});
 if(action==='chat'){
  await new Promise(r=>setTimeout(r,180));
  if(window.__mockFailures.chat-->0)return {ok:false,status:503,json:async()=>({error:'Temporary coaching issue'})};
  if(!window.__reqs.has(body.requestId)){
   window.__reqs.add(body.requestId);window.__charges.chat++;window.__mockState.credits--;
   const at=Date.now();
   window.__mockState.messages.push({role:'user',at,content:body.message},{role:'assistant',at,content:'Here is your personalised career recommendation. Follow up with concrete examples.'});
  }
  return ok({state:window.__mockState});
 }
 if(action==='reviewResume'){
  await new Promise(r=>setTimeout(r,150));
  if(window.__mockFailures.resume-->0)return {ok:false,status:503,json:async()=>({error:'Temporary resume issue'})};
  if(!window.__reqs.has(body.requestId)){
   window.__reqs.add(body.requestId);window.__charges.resume++;window.__mockState.credits-=5;
   let n=window.__charges.resume;
   window.__mockState.resumeReviews.push({id:body.requestId,createdAt:Date.now(),review:{headline:'Resume review '+n+' done',strengths:['Leadership impact'],missingDetails:['Results'],corrections:['Add metrics','Improve ATS','Shorten summary'],exampleImprovement:'Led initiative improving [metric]',nextActions:['Add evidence','Recheck language']}});
  }
  return ok({state:window.__mockState});
 }
 return {ok:false,status:404,json:async()=>({error:'Unexpected API: '+action})};
};
</script>'''.replace('SEED',json.dumps(seed))
html=html.replace('</body>',mock+'<script>'+(root/'app.js').read_text().replace('const uuid=()=>crypto.randomUUID();',"let __uuidCount=0;const uuid=()=> '11111111-1111-4111-8111-'+String(++__uuidCount).padStart(12,'0');")+'</script></body>')
resume='Operations leader with experience managing transformation and automation across a large organisation. Led cross-functional projects and helped teams coordinate strategic programmes and reporting.'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1280,390,320]:
  page=browser.new_page(viewport={'width':width,'height':850})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_function("!!state && current === 'Choose' && !loading")
  page.locator('#coachNavButton').click()
  assert page.locator('#screenCoach').is_visible()
  assert page.locator('#coachGuide').is_visible() and page.locator('#coachGuide').evaluate('(el)=>el.open')
  assert page.locator('#resumeReviewOpen').is_enabled() and page.locator('#resumeReviewOpen').is_visible()
  assert '12 coaching credits' in page.locator('#coachCreditInlineCount').inner_text()
  page.locator('#coachGuideDismiss').click()
  assert not page.locator('#coachGuide').evaluate('(el)=>el.open')
  page.locator('#resumeReviewOpen').click()
  assert page.locator('#resumeReviewPanel').is_visible()
  page.locator('#coachResumeText').fill(resume)
  page.locator('#resumeConsent').check()
  # The first attempt fails without consuming credits; a retry keeps the request ID.
  page.evaluate('window.__mockFailures.resume=1')
  page.locator('#submitResumeReview').click()
  page.wait_for_function('!loading')
  assert 'Temporary resume issue' in page.locator('#resumeReviewStatus').inner_text()
  assert page.evaluate('window.__charges.resume')==0
  assert page.evaluate('state.credits')==12
  page.locator('#submitResumeReview').click()
  page.wait_for_function("!loading && window.__charges.resume===1")
  assert page.locator('#reportDialog').is_visible()
  assert 'Resume review 1 done' in page.locator('#reportContent').inner_text()
  page.locator('#closeDialog').click()
  assert page.locator('#resumeReviewOpen').is_enabled()
  assert 'Review another resume' in page.locator('#resumeReviewOpen').inner_text()
  assert '7 coaching credits' in page.locator('#coachCreditInlineCount').inner_text()
  page.locator('#resumeReviewOpen').click()
  page.locator('#coachResumeText').fill(resume+' Additional measurable project achievements.')
  page.locator('#resumeConsent').check()
  page.locator('#submitResumeReview').click()
  page.wait_for_function("!loading && window.__charges.resume===2")
  assert page.locator('#reportDialog').is_visible()
  page.locator('#closeDialog').click()
  assert page.locator('#resumeReviewOpen').is_enabled()
  assert page.locator('.resume-timeline-entry').count()==2
  assert '2 coaching credits' in page.locator('#coachCreditInlineCount').inner_text()
  assert 'Only 2 credits left' in page.locator('#creditWarning').inner_text()
  page.locator('#resumeReviewOpen').click()
  assert page.locator('#screenRefills').is_visible() and page.locator('#resumeReviewPanel').is_hidden()
  page.locator('#refillBack').click()
  assert page.locator('#screenCoach').is_visible()
  # Retry chat after a simulated failure; no credit should be charged for failure.
  page.evaluate('window.__mockFailures.chat=1')
  page.locator('#chatInput').fill('How should I prepare for a Director of Transformation interview?')
  page.locator('#chatSend').click()
  assert 'Career Buddy is preparing your response' in page.locator('#chatActivity').inner_text()
  page.wait_for_function('!loading')
  assert 'Temporary coaching issue' in page.locator('#chatActivity').inner_text()
  assert page.evaluate('window.__charges.chat')==0
  assert page.locator('#chatInput').input_value().startswith('How should I prepare')
  page.locator('#chatSend').click()
  page.wait_for_function('!loading && window.__charges.chat===1')
  assert 'New response received' in page.locator('#chatActivity').inner_text()
  assert page.locator('#chatReplyNotice').is_visible()
  assert page.locator('.latest-reply').count()==1
  assert '1 coaching credit remaining' in page.locator('#coachCreditInlineCount').inner_text()
  assert page.locator('#creditWarning').is_visible()
  page.locator('#chatViewReply').click()
  assert page.locator('#chatReplyNotice').is_hidden()
  assert 'career recommendation' in page.locator('#chatMessages').inner_text()
  # Last credit should give a zero-credit message by the composer, not only at top.
  page.locator('#chatInput').fill('Give me a practical project for this role')
  page.locator('#chatSend').click()
  page.wait_for_function('!loading && window.__charges.chat===2')
  assert 'No credits left' in page.locator('#creditWarning').inner_text()
  assert page.locator('#resumeReviewOpen').is_enabled()
  assert page.locator('#chatInput').is_disabled()
  # A new reply must not yank the user away from earlier messages while reading.
  page.evaluate('''() => {
   window.__mockState.credits=8;
   window.__mockState.messages=[];
   for(let i=0;i<18;i++){
    window.__mockState.messages.push({role:'user',at:100000+i*1000,content:'Career question '+i+' asking about workplace change and skill development.'});
    window.__mockState.messages.push({role:'assistant',at:100500+i*1000,content:('Detailed guidance '+i+' for workplace leadership, stakeholder communication, and strategic planning. ').repeat(8)});
   }
   state=window.__mockState;paintCoach();document.querySelector('#chatMessages').scrollTop=0;
  }''')
  page.locator('#chatInput').fill('How can I demonstrate my career progress clearly?')
  page.locator('#chatSend').click()
  page.wait_for_function('!loading && window.__charges.chat===3')
  assert page.locator('#chatReplyNotice').is_visible()
  assert page.evaluate("document.querySelector('#chatMessages').scrollTop")<80
  page.locator('#chatViewReply').click()
  assert page.evaluate("document.querySelector('#chatMessages').scrollTop")>80
  assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'),f'Layout overflow {width}px'
  assert not errors, errors
  page.close()
  print('PASS',width,'intro, repeat resume reviews, no double-charge, low-credit refill, chat response and retry, layout')
 browser.close()
