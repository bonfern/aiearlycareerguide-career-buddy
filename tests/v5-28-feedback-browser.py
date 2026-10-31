"""Offline browser smoke tests of the V5.28 report content and feedback forms.
All backend calls are mocked; this does not validate live Firestore permissions.
"""
from pathlib import Path
import base64,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text();css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 html=html.replace('./'+asset,data)
 css=css.replace("url('./"+asset+"')",f"url('{data}')")
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"\s*/>','<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"\s*></script>','',html)
app=(root/'app.js').read_text()
html=html.replace('</body>','<script>'+app+'</script></body>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1280,390,320):
  page=browser.new_page(viewport={'width':width,'height':800})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_function("document.querySelector('#processingOverlay').classList.contains('hidden')")
  page.evaluate("""() => {
   window.savedFeedback=[];
   api=async(action,data)=>{if(action==='feedbackSubmit'){window.savedFeedback.push(data);return {ok:true}}throw Error('Unexpected '+action)};
   state={id:'x',email:'user@example.org',tier:'free',feedbackAdmin:false,
   freeReport:{version:6,profileSummary:'I want to work in transformation.',transferableAdvantage:'My reported experience gives me a starting point.',targetCompetencies:Array.from({length:4},(_,i)=>({title:'Role skill '+i,bullets:['Understand the requirements of this capability.','Practise the capability in a small work example.']})),careerOpportunities:['Transformation manager: use planning skills. Explore examples in job descriptions.','Project manager: plan delivery. Explore a project case.','Analyst: find insights. Review common job tasks.'],nextBestMoves:['Explore a project','Try a task','Review jobs'],furtherAssessment:[]},
   profile:{targetRole:'Transformation Manager'},messages:[],credits:40,resumeReviews:[],assessment:{total:0,answered:0,competencies:[]}}
   show('Snapshot');paint();
  }""")
  assert page.locator('#snapshotSummary .free-role-skills > li').count()==4
  assert page.locator('#snapshotSummary .free-role-skills > li').first.locator('p').count()==2
  assert page.locator('#snapshotSummary .premium-inclusions > li').count()==7
  assert page.locator('#snapshotSummary .sample-report-link').count()==1
  feedback=page.locator('#feedbackFree')
  feedback.get_by_role('button',name='5 out of 5').click()
  feedback.get_by_role('button',name='Send feedback').click()
  page.wait_for_function('window.savedFeedback.length===1')
  assert page.evaluate('window.savedFeedback[0].stage')=='free'
  page.evaluate("""() => {state.tier='paid';state.report={summary:'Your career report'};state.reportGenerated=true;show('Toolkit');paint();}""")
  premium=page.locator('#feedbackPremium')
  premium.get_by_role('button',name='4 out of 5').click()
  premium.get_by_role('button',name='Send feedback').click()
  page.wait_for_function('window.savedFeedback.length===2')
  assert page.evaluate('window.savedFeedback[1].stage')=='premium'
  page.evaluate("""() => {state.messages=[{role:'user',content:'How do I build evidence?',at:1793538888000},{role:'assistant',content:'Write a short project case.',at:1793538889000}];show('Coach');paint();}""")
  page.locator('.chat-feedback .feedback-quick').first.click()
  page.wait_for_function('window.savedFeedback.length===3')
  assert page.evaluate('window.savedFeedback[2].anchor')=='1793538889000'
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}px'
  page.close()
  print(f'{width}px: free and Premium forms, chat helpfulness, report content, layout PASS')
 browser.close()
