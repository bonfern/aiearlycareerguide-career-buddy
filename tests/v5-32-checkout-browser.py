"""Offline UI exercise of guest Free->Premium and Email->Payment without OTP.
All server/payment calls are mocked; use staging for real integrations."""
from pathlib import Path
import re,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 html=html.replace('./'+asset,data)
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"\s*/>', '<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"\s*></script>','',html)
mock=r'''<script>
let mockSession=null;
Object.defineProperty(window.crypto,'randomUUID',{value:()=> '11111111-1111-4111-8111-111111111111',configurable:true});
window.Razorpay=class{
 constructor(options){this.options=options;this.opened=false;}
 on(){}
 open(){this.opened=true;setTimeout(()=>this.options.handler({razorpay_order_id:'order_fake000',razorpay_payment_id:'pay_fake000',razorpay_signature:'fake_signature'}),10);}
};
window.fetch=async (url, options)=>{
 const action=new URL(url,'https://example.org').searchParams.get('action');
 const body=options?.body?JSON.parse(options.body):{};
 if(action==='config')return {ok:true,status:200,json:async()=>({configured:true,guestEnabled:true,privatePreview:false,paymentMode:'razorpay_live'})};
 if(action==='state'&&!mockSession)return {ok:false,status:401,json:async()=>({error:'No saved session'})};
 const guest={id:'a'.repeat(64),guest:true,email:'',emailVerified:false,journeyPreference:'free',tier:'free',freeReport:null,freeReportReady:false,
  profile:{freeIntakeVersion:22,assessmentTargetRole:'VP Process Excellence',targetGoalRole:'VP Process Excellence',currentRole:'Head of Shared Services'},
  guided:{question:{id:'careerStage',text:'Where are you in your career?',kind:'single',options:['Senior Leader / Executive','Manager']},completed:0,total:8},
  freeReadiness:{missing:['Complete all free questions']},quickHistory:[],credits:0,previewOrders:[],paymentMode:'razorpay_live',checkoutReady:true,packs:[]};
 if(action==='guestStart')mockSession=guest;
 if(action==='checkoutIdentity')mockSession={...mockSession,guest:false,email:body.email,emailVerified:false};
 if(action==='setAssessmentRole')mockSession={...mockSession,profile:{...mockSession.profile,assessmentTargetRole:body.role}};
 if(action==='livePaymentVerify')mockSession={...mockSession,tier:'paid',credits:40,reportGenerated:false,assessment:{started:false,finished:false,preparationStep:0,savedQuestionCount:0}};
 let reply=action==='liveCheckout'?{kind:'checkout',checkout:{keyId:'rzp_test_mock',orderId:'order_fake000',amountPaise:49900,currency:'INR',name:'AI Early Career Guide',description:'Premium assessment',email:mockSession.email}}:
 {state:mockSession,notice:'Payment confirmed'};
 return {ok:true,status:200,json:async()=>reply};
};
</script>'''
html=html.replace('</body>',mock+'<script>'+ (root/'app.js').read_text() +'</script></body>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1280,390,320]:
  page=browser.new_page(viewport={'width':width,'height':844});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
  page.set_content(html,wait_until='load');page.wait_for_function("document.querySelector('#processingOverlay').classList.contains('hidden')")
  assert page.locator('#screenChoose').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Landing overflow '+str(width)
  page.locator('#chooseAssessment').click()
  page.locator('#screenFree').wait_for(state='visible')
  assert page.locator('#screenLogin').is_hidden()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Questions overflow '+str(width)
  page.evaluate("""()=>{state.freeReport={version:7,profileSummary:'Head of Shared Services aiming for VP Process Excellence.',transferableAdvantage:'Leadership skills support enterprise planning.',targetCompetencies:[],careerOpportunities:['VP Process Excellence — your goal'],nextBestMoves:['Review an executive role brief.']};show('Snapshot');paint();}""")
  page.locator('#snapshotUpgrade').click()
  assert page.locator('#screenUpgrade').is_visible(), 'Upgrade must show offer not OTP'
  assert page.locator('#screenLogin').is_hidden()
  assert page.locator('#checkoutEmailStarter').is_visible()
  page.locator('#checkoutEmailStarter').fill('buyer@example.com')
  page.locator('#checkoutConsentStarter').check()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Upgrade overflow '+str(width)
  if width==390:page.screenshot(path='/mnt/data/v532/samples/V5_32_Checkout_Mobile.png',full_page=True)
  page.locator('#activateStarter').click()
  page.locator('#screenPaid').wait_for(state='visible',timeout=3000)
  assert page.locator('#paidRecoveryPanel').is_visible(), 'Recovery not shown for unverified paid buyer'
  assert 'buyer@example.com' in page.locator('#paidRecoveryEmail').inner_text()
  assert page.locator('#screenLogin').is_hidden()
  assert not errs,errs
  print(width,'px PASS: Guest assessment → single-screen email checkout → paid without OTP; no overflow')
  page.close()
 # Check the direct Career Buddy coaching offer, including guest email capture.
 page=browser.new_page(viewport={'width':390,'height':844});errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='load');page.wait_for_function("document.querySelector('#processingOverlay').classList.contains('hidden')")
 page.locator('#chooseAssessment').click();page.locator('#screenFree').wait_for(state='visible')
 page.evaluate("""()=>{state.freeReport={version:7,profileSummary:'Exploring leadership roles.',transferableAdvantage:'Stated strengths in operations.',targetCompetencies:[],careerOpportunities:['VP Process Excellence'],nextBestMoves:['Review governance.']};show('Snapshot');paint();}""")
 page.locator('#snapshotCoach').click()
 assert page.locator('#screenCoachOffer').is_visible(),'Coaching offer should appear before registration'
 assert page.locator('#checkoutEmailIntro').is_visible(),'Coaching checkout email missing'
 assert page.locator('#screenLogin').is_hidden(),'Coaching cannot require OTP at the start'
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),'Coaching checkout overflow'
 assert not errs,errs
 print('390 px PASS: Direct Career Buddy coaching offer has integrated email checkout, no OTP')
 page.close()
 browser.close()
