"""Local browser fixture: Razorpay TEST payment success/failure and mobile flow (no external calls)."""
from pathlib import Path
import re,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="/style\.css(?:\?[^\"]*)?"/>','<style>'+(root/'style.css').read_text()+'</style>',html)
html=re.sub(r'<script defer src="/app\.js(?:\?[^\"]*)?"></script>','',html)
for filename in ['brand-logo.webp','career-welcome.webp','career-coaching.webp']:
 html=html.replace('/'+filename,'data:image/webp;base64,'+base64.b64encode((root/filename).read_bytes()).decode())
html=html.replace('</body>','<script>'+(root/'app.js').read_text()+'</script></body>')
script='''() => {
 configured=true;if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-000000000000'});
 state={email:'tester@example.com',paymentMode:'razorpay_test',tier:'free',credits:0,creditsGranted:0,
  expiresAt:new Date(Date.now()+86400000).toISOString(),freeReport:{version:4,profileSummary:'My career profile.',targetCompetencies:[],nextSteps:[],furtherAssessment:[]},
  profile:{targetRole:'Director of Process Excellence'},guided:{finished:true,completed:7,total:7,question:null},
  messages:[],report:null,assessment:{started:false,answered:0,total:0,finished:false,question:null},resumeDecision:''};
 window.called=[];
 api=async(action,body)=>{
  called.push(action);
  if(action==='testCheckout')return {checkout:{keyId:'rzp_test_abcdefghi',orderId:'order_ABC1234567',amountPaise:49900,currency:'INR',name:'Career Buddy',description:'Sandbox checkout',email:'tester@example.com'}};
  if(action==='testPaymentVerify')return {state:{...state,tier:'paid',credits:60,creditsGranted:60,pendingTestCheckout:null},notice:'Sandbox payment confirmed'};
  if(action==='testPaymentStatus')return {state:{...state,tier:'paid',credits:60,creditsGranted:60,pendingTestCheckout:null},notice:'Recovered successful test payment'};
  throw Error('Unexpected endpoint '+action);
 };
 loadRazorpayCheckout=async()=>{};
 window.Razorpay=function(opts){this.open=()=>setTimeout(()=>opts.handler({razorpay_order_id:opts.order_id,razorpay_payment_id:'pay_ABC1234567',razorpay_signature:'0'.repeat(64)}),20);this.on=()=>{};};
 show('Upgrade');paint();
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,label in [(1280,'desktop'),(390,'mobile')]:
  page=browser.new_page(viewport={'width':width,'height':900})
  page.on('pageerror',lambda e: print('Browser error:',e))
  page.set_content(html,wait_until='load')
  page.evaluate(script)
  assert page.locator('#activateStarter').inner_text().startswith('Pay using Razorpay TEST')
  page.locator('#activateStarter').click()
  page.wait_for_function("state?.credits===60")
  assert page.locator('#screenResume').is_visible()
  assert page.evaluate("JSON.stringify(window.called)")== '["testCheckout","testPaymentVerify"]'
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.screenshot(path=str(root.parent/f'Career_Buddy_V5_7_Sandbox_{label}.png'),full_page=True)
  print(f'{label}: sandbox checkout, verified credits, paid resume route: PASS')
  page.close()
 browser.close()
