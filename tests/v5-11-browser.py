"""Browser smoke checks for V5.11: free editing and two paid plans; no live payments."""
from pathlib import Path
import re,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 css=css.replace("url('./"+asset+"')",f"url('{data}')")
 html=html.replace('src="./'+asset+'"',f'src="{data}"')
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"/>','<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"></script>','',html)
html=html.replace('</body>','<script>'+(root/'app.js').read_text()+'</script></body>')
setup="""() => {configured=true;privatePreview=false;if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-000000000000'});state={id:'x',email:'qa@example.com',mode:'public-live',paymentMode:'razorpay_live',tier:'free',credits:0,creditsGranted:0,expiresAt:new Date(Date.now()+86400000).toISOString(),freeReport:{version:4,profileSummary:'You are a professional exploring a more senior role.',targetCompetencies:[{title:'Leadership',bullets:['Lead a project team','Review team plans']}],nextSteps:[],furtherAssessment:['Explain your role-specific technical capability with a practical example.']},profile:{employmentStatus:'Employed full-time',currentRole:'Quality Lead',targetRole:'Director of Process Excellence'},guided:{finished:true,completed:7,total:7,question:null},messages:[],assessment:{started:false,answered:0,total:0,finished:false,question:null},resumeDecision:''};window.calls=[];window.Razorpay=function(options){this.on=()=>{};this.open=()=>options.handler({razorpay_order_id:options.order_id,razorpay_payment_id:'pay_SAMPLE',razorpay_signature:'sig_SAMPLE'});};api=async (action,body)=>{calls.push({action,body});if(action==='liveCheckout'){let amount=body.packId==='starter'?49900:14900;return {kind:'checkout',checkout:{keyId:'rzp_live_example',amountPaise:amount,currency:'INR',orderId:'order_'+body.packId,name:'Career Buddy',description:body.packId,email:state.email}};}if(action==='livePaymentVerify'){let pack=body.orderId.endsWith('starter')?'starter':'intro';state={...state,tier:pack==='starter'?'paid':'coach',credits:pack==='starter'?60:15,creditsGranted:pack==='starter'?60:15,pendingLiveCheckout:null};return {state,notice:'Verified payment captured'};}if(action==='quickBack'){state={...state,profile:{...state.profile,employmentStatus:''},guided:{completed:0,total:7,question:{id:'employmentStatus',kind:'single',text:'Which work situation best describes you right now?',options:['Employed full-time','Employed part-time','Self-employed','Between jobs','Student or recent graduate']}}};return {state,draft:{id:'employmentStatus',value:'Employed full-time',other:''}};}if(action==='quick'){state={...state,profile:{...state.profile,employmentStatus:body.value},guided:{completed:1,total:7,question:{id:'currentRole',kind:'text',text:'What is your current or most recent job title?',minLength:3,maxLength:120}}};return {state};}throw Error('Unexpected action '+action);};show('Choose');}"""
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,label in [(1280,'desktop'),(390,'mobile'),(320,'small mobile')]:
  page=browser.new_page(viewport={'width':width,'height':850})
  errs=[];page.on('pageerror',lambda error:errs.append(str(error)))
  page.set_content(html,wait_until='load');page.evaluate(setup)
  assert page.locator('a.site-home').get_attribute('href')=='https://www.aiearlycareerguide.com/'
  for slug in ['know-more.html','faq.html','terms.html','privacy.html','refund.html','contact.html']:
   assert page.locator('.landing-links a[href="./'+slug+'"]').count()==1
  assert page.locator('.buddy-eyebrow').inner_text()=='CAREER BUDDY'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Landing horizontal overflow '+label
  # Last question, screen review, back prefills the answer and can continue without AI.
  page.evaluate("show('Free');paint();")
  page.locator('#freeQuestion button').filter(has_text='Review and change').click()
  page.wait_for_function("state.guided.question?.id==='employmentStatus'")
  assert page.locator('input[value="Employed full-time"]').is_checked()
  page.locator('input[value="Employed part-time"]').check()
  page.locator('#freeQuestion button').filter(has_text='Continue').click()
  page.wait_for_function("state.guided.question?.id==='currentRole'")
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Free page overflow '+label
  assert page.evaluate('window.calls.map(x=>x.action)')==['quickBack','quick']
  # Premium paid path: charged only after Razorpay callback and backend verify.
  page.evaluate("show('Upgrade');paint();")
  page.locator('#activateStarter').click()
  page.wait_for_function("state?.tier==='paid'")
  assert page.locator('#screenResume').is_visible()
  assert page.evaluate('window.calls.filter(x=>x.action===\'liveCheckout\')[0].body.packId')=='starter'
  assert page.evaluate('window.calls.filter(x=>x.action===\'livePaymentVerify\').length')==1
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Premium overflow '+label
  # Independent intro coaching purchase from a fresh free session
  page.evaluate("state={...state,tier:'free',credits:0,creditsGranted:0};show('CoachOffer');paint();")
  page.locator('#activateIntro').click()
  page.wait_for_function("state?.tier==='coach'")
  assert page.locator('#screenCoach').is_visible()
  assert page.evaluate('window.calls.filter(x=>x.action===\'liveCheckout\')[1].body.packId')=='intro'
  assert page.evaluate('window.calls.filter(x=>x.action===\'livePaymentVerify\').length')==2
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Intro coaching overflow '+label
  assert not errs,errs
  print(label,'homepage/nav, free back/edit, Premium checkout, Intro checkout, mobile width: PASS')
  if label=='mobile':page.screenshot(path='/mnt/data/Career_Buddy_V5_11_mobile_preview.png',full_page=True)
  page.close()
 browser.close()
