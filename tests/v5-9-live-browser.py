"""Desktop/mobile mocked private LIVE coupon flow. No Razorpay or external network calls."""
from pathlib import Path
import re,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="/style\.css(?:\?[^"]*)?"/>','<style>'+(root/'style.css').read_text()+'</style>',html)
html=re.sub(r'<script defer src="/app\.js(?:\?[^"]*)?"></script>','',html)
for f in ['brand-logo.webp','career-welcome.webp','career-coaching.webp']:
 html=html.replace('/'+f,'data:image/webp;base64,'+base64.b64encode((root/f).read_bytes()).decode())
html=html.replace('</body>','<script>'+(root/'app.js').read_text()+'</script></body>')
script='''() => {
 configured=true;if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-000000000000'});
 state={id:'x',email:'tester@example.com',mode:'private-live',paymentMode:'razorpay_live',tier:'free',credits:0,creditsGranted:0,
  expiresAt:new Date(Date.now()+86400000).toISOString(),freeReport:{version:4,profileSummary:'Profile assessment complete',targetCompetencies:[],nextSteps:[],furtherAssessment:[]},
  profile:{targetRole:'Director of Process Excellence'},guided:{finished:true,completed:7,total:7,question:null},
  messages:[],report:null,assessment:{started:false,answered:0,total:0,finished:false,question:null},resumeDecision:''};
 window.actions=[];
 api=async(action,data)=>{
  actions.push(action);
  if(action==='liveCheckout'){
   if(data.couponCode!=='PILOT100')throw Error('Invalid coupon');
   return {kind:'complimentary',state:{...state,tier:'paid',credits:60,creditsGranted:60,pendingLiveCheckout:null},notice:'Approved 100% private pilot coupon accepted'};
  }
  throw Error('Unexpected backend endpoint '+action);
 };
 show('Upgrade');paint();
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,label in [(1280,'desktop'),(390,'mobile')]:
  page=browser.new_page(viewport={'width':width,'height':850})
  errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(html,wait_until='load')
  page.evaluate(script)
  assert page.locator('#activateStarter').inner_text().startswith('Apply coupon')
  assert not page.locator('#testerTools').is_visible()
  page.locator('#starterCoupon').fill('PILOT100')
  page.locator('#activateStarter').click()
  page.wait_for_function('state?.credits===60')
  assert page.locator('#screenResume').is_visible()
  assert page.evaluate('window.actions')==['liveCheckout']
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  assert not errs,errs
  print(label,'approved live free coupon, no Razorpay checkout, paid assessment unlocked, responsive: PASS')
  page.close()
 browser.close()
