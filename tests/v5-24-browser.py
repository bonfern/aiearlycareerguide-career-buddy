"""Desktop/mobile page and report workflow in a mocked browser; no live OpenAI or Razorpay calls."""
from pathlib import Path
import re,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 html=html.replace('./'+asset,data)
 css=css.replace("url('./"+asset+"')",f"url('{data}')")
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"\s*/>','<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"\s*></script>','',html)
html=html.replace('</body>','<script>'+(root/'app.js').read_text().replace('const uuid=()=>crypto.randomUUID();',"const uuid=()=> '11111111-1111-4111-8111-111111111111';")+'</script></body>')
script="""() => {
 state={id:'u1',email:'owner@example.org',paymentMode:'razorpay_live',checkoutReady:true,
 tier:'paid',credits:40,freeReport:{version:6,profileSummary:'Ready'},reportGenerated:false,
 profile:{targetRole:'Data Analyst'},assessment:{started:true,finished:true,answered:15,total:15,competencies:[{name:'Analysis'}]},
 messages:[],resumeReviews:[],pendingLiveCheckout:null};
 let calls=0;
 api=async(action,body)=>{if(action==='report'){
   calls++;if(calls===1)return {preparing:true,phase:'interview',notice:'Preparing role-specific interview topics…'};
   if(calls===2)return {preparing:true,phase:'in_progress',notice:'Writing your competency-based report…'};
   return {completed:true,state:{...state,reportGenerated:true,report:{summary:'Completed'},tier:'paid'}};
 } if(action==='setJourney')return {state};if(action==='couponStatus')return {discountPercent:100,priceInr:0};throw Error('unexpected '+action);};
 show('Paid');paint();window.__reportCalls=()=>calls;
}"""
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1280,390]:
  page=browser.new_page(viewport={'width':width,'height':780})
  errors=[];page.set_default_timeout(6000);page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load');page.wait_for_timeout(150)
  # Images should be contained rather than cut across the width on desktop.
  page.evaluate("show('Choose')")
  # The frontend is mocked here; check element geometry instead of taking a public-site screenshot.
  if width==1280:
   dims=page.locator('.hero-image').evaluate('(e)=>({naturalWidth:e.naturalWidth,naturalHeight:e.naturalHeight,displayWidth:e.getBoundingClientRect().width,displayHeight:e.getBoundingClientRect().height,fit:getComputedStyle(e).objectFit})')
   assert dims['fit']=='contain' and dims['displayHeight']/dims['displayWidth']>0.95,dims
  page.evaluate(script)
  assert page.locator('#premiumNavButton').is_visible()
  assert page.locator('#coachNavButton').is_visible()
  page.locator('#paidQuestion button').click()
  page.wait_for_timeout(150)
  page.locator('#coachNavButton').click()
  assert page.locator('#screenCoach').is_visible()
  page.locator('#premiumNavButton').click()
  assert page.locator('#screenPaid').is_visible()
  page.wait_for_timeout(11000)
  assert page.evaluate('state.reportGenerated')
  assert page.locator('#screenToolkit').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  assert not errors,errors
  print(width,'px: nav works during report prep, recovery mock completes, hero and layout PASS')
  page.close()
 browser.close()
