"""Mocked UI/browser regression checks. Does not call OpenAI, Firebase or Razorpay."""
from pathlib import Path
import re,base64,json
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 html=html.replace('src="./'+asset+'"',f'src="{data}"')
 css=css.replace("url('./"+asset+"')",f"url('{data}')")
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"/>','<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"></script>','',html)
seed={'id':'customer','email':'customer@example.org','mode':'public-live','paymentMode':'razorpay_live','checkoutReady':False,'journeyPreference':'premium','tier':'paid','credits':40,'freeReport':{'version':4,'profileSummary':'Senior employee evaluating career progression','targetCompetencies':[],'furtherAssessment':[]},'profile':{'currentRole':'Operations Lead','targetRole':'Director of Operations','roleExperience':['Transformation planning']},'guided':{'finished':True,'completed':7,'total':7,'question':None},'assessment':{'started':True,'finished':True,'answered':15,'total':15,'question':None,'competencies':[]},'messages':[],'resumeReviews':[],'reportGenerated':True,'report':{'skillAssessments':[]},'expiresAt':'2027-12-01T10:00:00Z'}
mock='''<script>
window.__mockState=SEED;
window.fetch=async(url,init)=>{const a=new URL(url,'https://example.org').searchParams.get('action');
 if(a==='reviewResume'){
  await new Promise(done=>setTimeout(done,350));
  window.__mockState.credits=35;
  window.__mockState.resumeReviews=[{id:'review-1',createdAt:Date.now(),review:{headline:'Role-ready resume changes',strengths:['Project delivery work'],missingDetails:['Evidence of outcomes'],corrections:['Quantify relevant work','Improve section headings','Focus the opening'],exampleImprovement:'Led [project] achieving [metric] improvement',nextActions:['Gather scope metrics','Review leadership evidence']}}];
  return {ok:true,status:200,json:async()=>({state:window.__mockState})};
 }
 const value=a==='config'?{configured:true,privatePreview:false,paymentMode:'razorpay_live',checkoutReady:false}:a==='state'?{state:window.__mockState}:a==='setJourney'?{state:window.__mockState}:null;
 if(value)return {ok:true,status:200,json:async()=>value};
 return {ok:false,status:403,json:async()=>({error:'Not available in mocked UI'})};
}
</script>'''.replace('SEED',json.dumps(seed))
html=html.replace('</body>',mock+'<script>'+(root/'app.js').read_text().replace('const uuid=()=>crypto.randomUUID();',"const uuid=()=> 'mocked-req-uuid';")+'</script></body>')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1280,390,320]:
  page=browser.new_page(viewport={'width':width,'height':800})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_function("current==='Choose' && !!state")
  assert page.locator('#screenChoose').is_visible()
  button=page.locator('.snapshot-cta')
  assert button.is_visible()
  assert page.evaluate("getComputedStyle(document.querySelector('.snapshot-cta')).fontWeight") in ('500','400')
  assert not page.locator('#processingOverlay').is_visible()
  page.locator('#coachNavButton').click()
  assert page.locator('#screenCoach').is_visible()
  assert page.locator('[data-coach-prompt="resume-review"]').is_visible()
  page.locator('[data-coach-prompt="resume-review"]').click()
  assert page.locator('#resumeReviewPanel').is_visible()
  data='Achievement from employer transforming business processes. '*245
  assert len(data)>1200
  assert page.locator('#coachResumeText').get_attribute('maxlength')=='16000'
  page.locator('#coachResumeText').fill(data)
  page.locator('#submitResumeReview').click()
  assert page.locator('#processingOverlay').is_visible(), 'Loading indicator while resume runs'
  page.wait_for_function("!!state?.resumeReviews?.length")
  page.wait_for_function("!loading")
  assert not page.locator('#processingOverlay').is_visible()
  assert page.locator('#reportDialog').is_visible()
  assert 'Role-ready resume changes' in page.locator('#reportContent').inner_text()
  assert page.evaluate('state.credits')==35
  page.locator('#closeDialog').click()
  assert page.locator('[data-coach-prompt="resume-review"]').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Unexpected mobile overflow'
  assert not errors,errors
  page.close();print(f'{width}px: Ayesha resume action, extended input, 5-credit result, processing indicator, responsive layout PASS')
 browser.close()
