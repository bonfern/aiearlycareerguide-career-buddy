"""Offline UI test with mocked HTTP only; does not claim production integration coverage."""
from pathlib import Path
import re,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 html=html.replace('./'+asset,data)
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"\s*/>', '<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"\s*></script>','',html)
mock=r'''<script>
window.fetch=async (url, opts)=>{
 const action=new URL(url,'https://example.org').searchParams.get('action');
 const state={id:'a'.repeat(64),guest:true,journeyPreference:'free',tier:'free',email:'',freeReport:null,freeReportReady:false,
  guided:{question:{id:'employmentStatus',text:'Which description fits your current career stage?',kind:'single',options:['Currently employed','Student']},completed:0,total:7},
  freeReadiness:{missing:['Complete all free questions']},quickHistory:[],profile:{},credits:0,previewOrders:[],
  paymentMode:'razorpay_live',checkoutReady:true,packs:[]};
 const payload=action==='config'?{configured:true,guestEnabled:true,privatePreview:false,paymentMode:'razorpay_live'}:
  action==='guestStart'?{state}:action==='setJourney'?{state}:action==='state'?{state:null,authenticated:false}:{ok:true};
 return {ok:true,status:200,json:async()=>payload};
};
</script>'''
app=(root/'app.js').read_text()
html=html.replace('</body>',mock+'<script>'+app+'</script></body>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1280,390,320]:
  page=browser.new_page(viewport={'width':width,'height':844})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_function("document.querySelector('#processingOverlay').classList.contains('hidden')")
  assert page.locator('#screenChoose').is_visible()
  assert page.locator('#notice').is_hidden(), 'First-time visitor must not see an authentication error'
  assert page.get_by_text('FREE Career Snapshot').first.is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'),'Landing page overflow at '+str(width)
  if width==390:
   page.screenshot(path='/mnt/data/work_v531/v531_landing_390.png',full_page=True)
  page.locator('#chooseAssessment').click()
  page.locator('#screenFree').wait_for(state='visible')
  assert page.locator('#screenLogin').is_hidden(), 'Free still asks for email before question one'
  assert 'Which description fits' in page.locator('#freeQuestion').inner_text()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Free questionnaire overflow'
  page.evaluate("""()=>{state.freeReport={version:6,profileSummary:'Your career direction.',transferableAdvantage:'Applied skills.',targetCompetencies:[],careerOpportunities:[],nextBestMoves:[]};show('Snapshot');paint();}""")
  page.locator('#snapshotUpgrade').click()
  assert page.locator('#screenUpgrade').is_visible(), 'Upgrade must show the integrated Premium checkout'
  assert page.locator('#checkoutEmailStarter').is_visible(), 'Premium checkout email field is missing'
  assert page.locator('#screenLogin').is_hidden(), 'Guest upgrade should not return to the OTP screen'
  assert not errors, errors
  print(f'{width}px: FREE CTA, instant guest questions, verified upgrade and no overflow PASS')
  page.close()
 browser.close()
