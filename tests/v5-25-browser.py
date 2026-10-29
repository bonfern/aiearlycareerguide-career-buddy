"""Mocked UI regression for preparation states. Does not touch production APIs."""
from pathlib import Path
import re,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 html=html.replace('./'+asset,data);css=css.replace("url('./"+asset+"')",f"url('{data}')")
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"\s*/>','<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"\s*></script>','',html)
app=(root/'app.js').read_text().replace('const uuid=()=>crypto.randomUUID();',"const uuid=()=> '11111111-1111-4111-8111-111111111111';")
html=html.replace('</body>','<script>'+app+'</script></body>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [1280,390,320]:
  page=browser.new_page(viewport={'width':width,'height':800})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.evaluate("""() => {state={id:'test',email:'u@example.org',journeyPreference:'premium',tier:'paid',paymentMode:'razorpay_live',checkoutReady:true,freeReport:{version:6},reportGenerated:false,profile:{targetRole:'Financial Analyst'},assessment:{started:false,preparationStep:1,competencies:[],total:0,answered:0},credits:40,messages:[],resumeReviews:[],packs:[]};show('Paid');paint();}""")
  card=page.locator('#paidQuestion')
  assert 'Step 1 of 3 completed' in card.inner_text()
  assert 'Your role competencies are saved' in card.inner_text()
  assert card.inner_text().count('Your completed steps are saved')==1
  assert card.get_by_role('button',name='Continue preparation').count()==1
  # First provider attempt fails, then two saved steps complete on retry.
  page.evaluate("""() => {let calls=0;api=async(action,body)=>{if(action!=='assessmentStart')throw Error('Unexpected '+action);calls++;if(calls===1)throw Error('We could not complete this question set. Your progress is saved. Please select Try again.');const currentStep=calls===2?2:3;return {state:{...state,assessment:{...state.assessment,preparationStep:currentStep,started:currentStep===3,total:12,answered:0,competencies:[{name:'Risk analysis'}]}}};};}""")
  card.get_by_role('button',name='Continue preparation').click()
  page.wait_for_function("document.querySelector('#paidQuestion').innerText.includes('Try again')")
  assert card.inner_text().count('We could not complete')==1
  assert not page.locator('#notice').is_visible(),'No duplicate banner of the same error'
  card.get_by_role('button',name='Try again').click()
  page.wait_for_function('state.assessment.started === true')
  assert 'Your role-specific assessment' not in card.inner_text()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal overflow'
  assert not errors,errors
  print(f'{width}px: saved progress, retry, no duplicate errors, and mobile layout PASS')
  page.close()
 browser.close()
