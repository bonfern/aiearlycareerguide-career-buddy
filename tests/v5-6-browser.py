"""Isolated desktop/mobile interaction check for V5.6 paid MCQs and free selection limit."""
from pathlib import Path
import re,base64
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="/style\.css(?:\?[^\"]*)?"/>','<style>'+(root/'style.css').read_text()+'</style>',html)
html=re.sub(r'<script defer src="/app\.js(?:\?[^\"]*)?"></script>','',html)
for name in ['brand-logo.webp','career-welcome.webp','career-coaching.webp']:
 html=html.replace('/'+name,'data:image/webp;base64,'+base64.b64encode((root/name).read_bytes()).decode())
html=html.replace('</body>','<script>'+(root/'app.js').read_text()+'</script></body>')
setup='''() => {
 configured=true;notice('');if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-000000000000'});
 const user={email:'verified-tester@example.com',profile:{targetRole:'Director of Process Excellence',currentRole:'Quality Manager',goal:'Get promoted',gaps:['Strategic planning'],roleExperience:['Lean Six Sigma']},freeReport:{version:4,profileSummary:'A useful starting point.',targetCompetencies:[],nextSteps:[],furtherAssessment:[]},
  tier:'paid',resumeDecision:'skip',credits:60,reportReady:false,reportGenerated:false,expiresAt:new Date(Date.now()+86400000).toISOString(),
  assessment:{started:false,answered:0,total:0,finished:false,question:null,competencies:[]},guided:{completed:7,total:7,question:null,finished:true},messages:[]};
 state=user;
 window.called=[];let answers=0;
 const makeQ=i=>({id:`s${Math.floor(i/3)+1}-q${(i%3)+1}`,competency:['Process analysis','Transformation delivery','Stakeholder influence','Change leadership'][Math.floor(i/3)],kind:'scenario',difficulty:'applied',text:`Your team is preparing a change with several risks. How would you balance business value and stakeholder needs in scenario ${i+1}?`,options:['Evaluate the evidence and compare trade-offs','Ask the team to share concerns and review details','Pilot changes and monitor the early effects','Build a phased delivery plan with owners','Not sure'],number:i+1,total:12});
 api=async(action,body)=>{
 window.called.push(action);
 if(action==='assessmentStart')return {state:{...state,assessment:{started:true,answered:0,total:12,finished:false,question:makeQ(0),competencies:[{name:'Process analysis',type:'technical'},{name:'Transformation delivery',type:'technical'},{name:'Stakeholder influence',type:'behavioural'},{name:'Change leadership',type:'behavioural'}]}}};
 if(action==='assessmentAnswer'){
   answers++;const a=state.assessment;
   return {state:{...state,assessment:{...a,answered:answers,finished:answers===12,question:answers===12?null:makeQ(answers)}}};
 }
 throw Error('Unexpected mock action: '+action);
 };
 show('Paid');paint();
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height,label in [(1366,800,'desktop'),(390,844,'mobile')]:
  page=browser.new_page(viewport={'width':width,'height':height})
  page.set_default_timeout(7000)
  errors=[];page.on('pageerror',lambda err: errors.append(str(err)))
  page.set_content(html,wait_until='load');page.wait_for_timeout(300);page.evaluate(setup)
  assert page.get_by_text('Assess your most important role skills').is_visible()
  page.locator('#paidQuestion button.primary').click()
  page.wait_for_function("document.querySelector('#paidCounter').textContent.includes('0 of 12')")
  assert page.locator('#paidQuestion input[type=radio]').count()==5
  assert not page.get_by_text('Generate my detailed career report',exact=False).is_visible()
  page.screenshot(path=str(root.parent/f'Career_Buddy_V5_6_Paid_{label}.png'),full_page=True)
  for i in range(12):
   page.locator('#paidQuestion input[type=radio]').nth(i%5).check()
   page.locator('#paidQuestion button.primary').click()
   page.wait_for_function(f"document.querySelector('#paidCounter').textContent.includes('{i+1} of 12')")
   assert page.evaluate('window.scrollY')==0
  assert page.get_by_text('Generate my detailed career report').is_visible()
  assert page.locator('#paidQuestion button.primary').is_enabled()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  page.evaluate('''() => {
   state={...state,tier:'free',freeReport:null,assessment:{started:false,answered:0,total:0,finished:false,question:null},freeReportReady:false,
    guided:{completed:5,total:7,finished:false,question:{id:'roleExperience',kind:'multi',text:'Which target-role competencies have you used in practice? Select up to 4.',options:['Strategy','Lean','Finance','Change','Communication','Analytics'],minSelections:1,maxSelections:4}}};
   show('Free');paint();
  }''')
  assert page.locator('#freeQuestion').get_by_text('Select up to 4.').is_visible()
  for i in range(4):page.locator('#freeQuestion input[type=checkbox]').nth(i).check()
  page.locator('#freeQuestion input[type=checkbox]').nth(4).click()
  assert page.locator('#freeQuestion input[type=checkbox]:checked').count()==4
  assert page.get_by_text('4 of 4 selected').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  assert not errors,errors
  print(f'{label}: free max-four UX and 12-question assessment/gated report: PASS')
  page.close()
 browser.close()
