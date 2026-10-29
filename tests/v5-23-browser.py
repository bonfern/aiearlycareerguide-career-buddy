"""Mocked checkout cancellation and report UI. No live Razorpay calls."""
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
script='''() => {
 state={id:'u1',email:'test@example.org',mode:'public-live',paymentMode:'razorpay_live',checkoutReady:true,
 journeyPreference:'free',tier:'free',credits:0,creditsGranted:0,freeReport:{version:6,profileSummary:'An aspiring business analyst.',
 targetCompetencies:[{title:'Process mapping',bullets:['Describe business activities and where tasks are handed over.']},
 {title:'Stakeholder communication',bullets:['Ask questions to identify business needs.']},
 {title:'Data analysis',bullets:['Examine datasets and explain trends.']},
 {title:'Requirements documentation',bullets:['Write descriptions of what a solution needs to deliver.']}],
 transferableAdvantage:'Some relevant work aligns with these tasks.',careerOpportunities:['Business Analyst — good direction','Operations Analyst — adjacent','Reporting Analyst — useful bridge'],
 nextBestMoves:['Draft a process map','Find three role examples','Practise a relevant tool'],furtherAssessment:['More detailed competency evaluation']},
 profile:{freeIntakeVersion:17,targetRole:'Business Analyst'},assessment:{started:false,finished:false,answered:0,total:0,preparationStep:0},
 messages:[],resumeReviews:[],pendingLiveCheckout:null};
 window.calls=[];
 api=async(action,body)=>{
  calls.push([action,body]);
  if(action==='liveCheckout')return {kind:'checkout',checkout:{orderId:'order_'+calls.length+'ABC',keyId:'rzp_live_test',amountPaise:14900,currency:'INR',name:'Career Buddy',description:'Test',email:state.email}};
  if(action==='liveCheckoutDismiss')return {state:{...state,pendingLiveCheckout:null},notice:'Checkout closed. You may choose another package.'};
  if(action==='setAssessmentRole')return {state};
  throw Error('Unexpected endpoint '+action);
 };
 window.Razorpay=class {constructor(options){this.options=options;}on(){}open(){setTimeout(()=>this.options.modal.ondismiss(),30);}};
 show('CoachOffer');paint();
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1280,390,320]:
  page=browser.new_page(viewport={'width':width,'height':780})
  errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_timeout(150)
  page.evaluate(script)
  page.locator('#activateIntro').click()
  page.wait_for_timeout(650);print("FIRST",page.evaluate("({loading,calls,notice:document.getElementById('notice').textContent,screen:current})"))
  assert page.evaluate('state.pendingLiveCheckout') is None
  assert page.locator('#notice').inner_text().startswith('Checkout closed')
  page.evaluate("show('Upgrade');paint();")
  page.locator('#activateStarter').click()
  page.wait_for_timeout(650);print("SECOND",page.evaluate("({loading,calls,notice:document.getElementById('notice').textContent,screen:current})"))
  assert page.locator('#screenUpgrade').is_visible()
  page.evaluate("show('Snapshot');paint();")
  assert page.locator('#snapshotSummary').inner_text().count('Process mapping')==1
  assert 'Stakeholder communication' in page.locator('#snapshotSummary').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  assert not errors,errors
  print(width,'px: both packs cancel without locking, report skills shown, responsive PASS')
  page.close()
 browser.close()
