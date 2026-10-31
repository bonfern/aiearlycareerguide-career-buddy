"""Offline browser checks for progress visibility, report disclaimer and responsive layout.
Runs against current source with mocked APIs, not Vercel/Firebase/OpenAI.
"""
from pathlib import Path
import re, base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(); css=(root/'style.css').read_text()
for asset in ['career-coaching.webp','career-welcome.webp','brand-logo.webp']:
 data='data:image/webp;base64,'+base64.b64encode((root/asset).read_bytes()).decode()
 html=html.replace('./'+asset,data)
 css=css.replace("url('./"+asset+"')",f"url('{data}')")
html=re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^\"]*)?"\s*/>','<style>'+css+'</style>',html)
html=re.sub(r'<script defer src="\./app\.js(?:\?[^\"]*)?"\s*></script>','',html)
app=(root/'app.js').read_text().replace('const uuid=()=>crypto.randomUUID();',"const uuid=()=> '11111111-1111-4111-8111-111111111111';")
html=html.replace('</body>','<script>'+app+'</script></body>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in (1280,390,320):
  page=browser.new_page(viewport={'width':width,'height':800})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load')
  page.wait_for_function("document.querySelector('#processingOverlay').classList.contains('hidden')")
  page.evaluate("""() => {
    state={id:'test',email:'test@example.org',tier:'paid',journeyPreference:'premium',freeReport:{version:6},credits:40,assessment:{started:true,total:12,answered:12,finished:true,competencies:[{name:'Data analysis'}]},reportPreparing:false,reportGenerated:false,report:null,profile:{targetRole:'Data Analyst'},messages:[],resumeReviews:[]};
    show('Paid');paint();
  }""")
  panel=page.locator('#paidQuestion')
  assert '2–3 minutes' in panel.inner_text()
  click=panel.get_by_role('button',name='Generate my detailed career report')
  page.evaluate("() => {window.resolveReport=null;api=async(action,body)=>{if(action!=='report')throw Error('Unexpected API '+action);return await new Promise(resolve=>window.resolveReport=resolve);};}")
  click.click()
  panel.locator('.task-progress-panel').wait_for()
  assert panel.locator('.task-spinner').count()==1
  assert 'Starting report generation' in panel.inner_text()
  assert 'Final checks and saving to My reports' in panel.inner_text()
  page.evaluate("reportPhase='interview';reportProgressText='Preparing role-specific interview topics…';paintPaidAssessment()")
  assert panel.locator('.task-step.active').inner_text().endswith('Preparing role-specific interview topics')
  page.evaluate("reportPhase='in_progress';reportProgressText='Writing your competency-based report…';paintPaidAssessment()")
  assert panel.locator('.task-step.active').inner_text().endswith('Writing your detailed report')
  assert panel.locator('.task-step.pending').count()==1
  page.evaluate("window.resolveReport({completed:true,state:{...state,reportGenerated:true,report:{summary:'Example'}}})")
  page.wait_for_function("document.querySelector('#screenToolkit').classList.contains('hidden') === false")
  assert not page.locator('#paidQuestion .task-progress-panel').is_visible()
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),f'overflow {width}px'
  # Already-saved historical scores should show caveat only in opening callout.
  page.evaluate("""() => {
   state.report={goalPath:{headline:'Data Analyst',careerActions:[]},summary:'Example career assessment',capabilityFocus:{technical:[{name:'Data analysis',currentCompetency:'2 of 3 matched. This evaluates decision-making, not verified job performance.',priority:'Build further',firstAction:'Practise'}],behavioural:[]},skillAssessments:[{name:'Data analysis',targetBenchmark:'Interpret metrics',currentCompetency:'2 of 3 matched. This evaluates decision-making, not verified job performance.',gap:'Practise dashboards',actions:['Practise charts'],practiceTask:'Create report',successIndicator:'Show work'}],additionalSkills:[],actionPlan:[],progressChecklist:[],learningGuidance:{free:[],paid:[],certifications:[]},interviewPreparation:[]};
   openDetailed();
  }""")
  dialog=page.locator('#reportDialog')
  assert dialog.locator('.report-scope-callout').count()==1
  assert 'not independently verified on-the-job performance' in dialog.inner_text()
  assert 'not verified job performance' not in dialog.inner_text()
  assert not errors,errors
  page.close()
  print(f'{width}px: report progress, server phases, successful completion, old report disclaimer, layout PASS')
 browser.close()
