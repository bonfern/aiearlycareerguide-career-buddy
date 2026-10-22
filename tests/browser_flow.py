"""V5.5 regression: assessment-first journey, screen scroll and contextual coaching."""
from pathlib import Path
import base64
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet" href="/style\.css(?:\?[^"]*)?"/>','<style>'+(root/'style.css').read_text()+'</style>',html)
html=re.sub(r'<script defer src="/app\.js(?:\?[^"]*)?"></script>','',html)
for name in ['brand-logo.webp','career-welcome.webp','career-coaching.webp']:
 html=html.replace('/'+name,'data:image/webp;base64,'+base64.b64encode((root/name).read_bytes()).decode())
html=html.replace('</body>','<script>'+(root/'app.js').read_text()+'</script></body>')

bootstrap='''() => {
 notice('');configured=true;
 if(!crypto.randomUUID){Object.defineProperty(crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-'+Math.random().toString(16).slice(2).padEnd(12,'0').slice(0,12)});}
 window.mockActions=[];window.__downloads=[];
 download=(kind,format='pdf')=>window.__downloads.push([kind,format]);
 state={tier:'free',journeyPreference:'free',email:'tester@example.com',credits:0,creditsGranted:0,
 expiresAt:new Date(Date.now()+86400000).toISOString(),
 guided:{completed:6,total:7,question:{id:'gaps',kind:'single',text:'What would you like to improve?',options:['Leadership','Interview confidence'],minSelections:1},finished:false},
 freeReadiness:{ready:false,missing:['Area to develop']},freeReportReady:false,freeReport:null,
 profile:{currentRole:'Process Excellence Manager',targetRole:'Director of Process Excellence',experience:'Over 20 years',goal:'Get promoted',gaps:['Strategic planning'],roleExperience:['Lean Six Sigma and process improvement']},
 reportGenerated:false,reportReady:false,readiness:{ready:false,missing:[]},resumeDecision:'',warning:'',expired:false,
 messages:[{role:'assistant',content:'Welcome. Your career information is saved.'}]};
 api=async(action,data)=>{
   window.mockActions.push(action);
   if(action==='setJourney')return {state:{...state,journeyPreference:data.journey}};
   if(action==='quick')return {state:{...state,guided:{completed:7,total:7,question:null,finished:true},freeReadiness:{ready:true,missing:[]},freeReportReady:true}};
   if(action==='freeReport')return {state:{...state,freeReport:{version:3,profileSummary:'Experienced professional exploring career growth.',targetCompetencies:[{title:'Leadership',bullets:['Lead teams','Manage goals']}],nextSteps:[{title:'Build a plan',bullets:['Review openings','Seek feedback']}],furtherAssessment:['Skill evidence','Behavioural competencies']}}};
   if(action==='mockPurchase')return {state:{...state,tier:data.packId==='starter'?'paid':'coach',credits:data.packId==='starter'?60:15,creditsGranted:15,expired:false,warning:'',resumeDecision:''},notice:'Test pack activated; no payment.'};
   if(action==='chat')return {state:{...state,credits:14,messages:[...state.messages,{role:'user',content:data.message,at:Date.now()},{role:'assistant',content:'Use examples that demonstrate your professional impact.',at:Date.now()}]}};
   throw Error('Unmocked action '+action);
 };
 show('Choose');paint();
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height,label in [(1366,840,'desktop'),(390,844,'mobile')]:
  page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  page.set_default_timeout(4000)
  print(label,'start',flush=True)
  errors=[];page.on('pageerror',lambda exc: errors.append(str(exc)))
  page.set_content(html,wait_until='load')
  page.evaluate(bootstrap)
  assert page.locator('#chooseAssessment').is_visible()
  assert page.locator('#choosePremium').count()==0
  assert page.locator('#chooseCoach').count()==0
  print(label,'welcome passed',flush=True)
  page.screenshot(path=str(root.parent/f'Career_Buddy_V5_5_Welcome_{label}.png'),full_page=True)
  # Direct coaching is inaccessible without a saved assessment.
  print(label,'before direct coaching gate',flush=True)
  page.evaluate('goCoach()')
  assert page.locator('#screenFree').is_visible()
  assert page.locator('#screenCoachOffer').is_hidden()
  page.evaluate("() => {notice('');show('Choose');}")
  print(label,'before free discovery click',flush=True)
  page.locator('#chooseAssessment').click()
  assert page.locator('#screenFree').is_visible()
  assert page.evaluate('flow')=='free'
  # Simulate a screen that was left scrolled halfway down on mobile.
  page.evaluate('''() => {const spacer=document.createElement('div');spacer.id='scrollTestSpacer';spacer.style.height='1600px';document.querySelector('#screenFree').append(spacer);window.scrollTo(0,950);}''')
  page.wait_for_function('window.scrollY > 400')
  page.evaluate("show('Free')")
  page.wait_for_function('window.scrollY === 0')
  page.evaluate("document.querySelector('#scrollTestSpacer').remove()")
  print(label,'before free question',flush=True)
  page.locator('#freeQuestion input[type=radio]').first.check()
  page.locator('#freeQuestion button.primary').click()
  page.wait_for_function("document.querySelector('#freeQuestion button.primary')?.textContent.includes('Generate free snapshot')")
  # Updating a question inside the same screen must restore page position.
  page.wait_for_timeout(150)
  assert page.evaluate('window.scrollY')==0, f'{label}: page did not scroll to top after quick answer'
  assert page.locator('#freeQuestion button.primary').is_enabled()
  page.locator('#freeQuestion button.primary').click()
  page.wait_for_function("!document.querySelector('#screenSnapshot').classList.contains('hidden')")
  assert page.locator('#snapshotUpgrade').is_visible()
  assert page.locator('#snapshotCoach').is_visible()
  assert page.locator('#coachNavButton').is_visible()
  page.screenshot(path=str(root.parent/f'Career_Buddy_V5_5_Snapshot_{label}.png'),full_page=True)
  page.locator('#snapshotDownload').click()
  assert page.evaluate('window.__downloads[0][0]')=='free'
  print(label,'snapshot reached',flush=True)
  page.locator('#snapshotCoach').click()
  assert page.locator('#screenCoachOffer').is_visible()
  print(label,'coach offer reached',flush=True)
  page.locator('#activateIntro').click()
  page.wait_for_function("!document.querySelector('#screenCoach').classList.contains('hidden')")
  assert page.locator('#chatSend').is_enabled()
  assert 'Director of Process Excellence' in page.locator('#coachContextNote').inner_text()
  assert 'Strategic planning' in page.locator('[data-coach-prompt]').first.get_attribute('data-coach-prompt')
  page.screenshot(path=str(root.parent/f'Career_Buddy_V5_5_Coach_{label}.png'),full_page=True)
  page.locator('[data-coach-prompt]').first.click()
  page.locator('#chatSend').click()
  page.wait_for_function("document.querySelector('#chatMessages').textContent.includes('Use examples')")
  assert page.locator('#coachPrompts').is_hidden()
  # Returning to premium option must not clear the free assessment.
  print(label,'chat done',flush=True)
  page.locator('#homeButton').click()
  assert page.locator('#choosePremium').count()==0
  print(label,'before premium upgrade',flush=True)
  page.locator('#chooseAssessment').click()
  assert page.locator('#screenSnapshot').is_visible()
  page.locator('#snapshotUpgrade').click()
  assert page.locator('#screenUpgrade').is_visible()
  page.locator('#activateStarter').click()
  page.wait_for_function("!document.querySelector('#screenResume').classList.contains('hidden')")
  assert page.locator('#resumePaste').is_visible()
  page.locator('#myReportsButton').click()
  assert page.locator('#reportsList').get_by_text('Free Career Snapshot').is_visible()
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), f'{label}: horizontal overflow'
  assert not errors,errors
  # Independent first-login check: free discovery survives email verification.
  page.evaluate("""() => {
    const newUser={tier:'free',journeyPreference:'free',email:'fresh@example.com',credits:0,creditsGranted:0,
      freeReport:null,freeReportReady:false,guided:{completed:0,total:7,question:{id:'employmentStatus',kind:'single',text:'What is your current situation?',options:['Working full-time','Studying']}},
      freeReadiness:{missing:['Role'],ready:false},readiness:{missing:[],ready:false},messages:[],expiresAt:new Date(Date.now()+86400000).toISOString()};
    state=null;show('Choose');configured=true;
    window.authCalls=[];
    api=async(action,data)=>{window.authCalls.push(action);if(action==='requestCode')return {ok:true};if(action==='verifyCode')return {state:newUser};if(action==='setJourney')return {state:{...newUser,journeyPreference:data.journey}};throw Error('Unexpected '+action);};
  }""")
  page.locator('#chooseAssessment').click()
  assert page.locator('#screenLogin').is_visible()
  page.locator('#emailAddress').fill('fresh@example.com')
  page.locator('#accessCode').fill('ownerpreview')
  page.locator('#requestOtp').click()
  assert page.locator('#verifyForm').is_visible()
  page.locator('#otpCode').fill('123456')
  page.locator('#verifyForm button[type=submit]').click()
  page.wait_for_function("!document.querySelector('#screenFree').classList.contains('hidden')")
  assert page.evaluate('state.journeyPreference')=='free'
  assert page.evaluate('window.authCalls').count('setJourney')==1
  print(f'{label}: free discovery → snapshot → coaching → premium resume, carryover and responsive layout: PASS')
  page.close()
 browser.close()
