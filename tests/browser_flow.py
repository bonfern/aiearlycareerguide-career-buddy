"""Local frontend regression: uses mocked API and real Chromium UI, no secrets/network."""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
html=html.replace('<link rel="stylesheet" href="/style.css"/>','<style>'+(root/'style.css').read_text()+'</style>')
html=html.replace('<script defer src="/app.js"></script>','')
for fn in ('brand-logo.webp','career-welcome.webp','career-coaching.webp'):
    html=html.replace('/'+fn,'data:image/webp;base64,'+base64.b64encode((root/fn).read_bytes()).decode())
html=html.replace('</body>','<script>'+(root/'app.js').read_text()+'</script></body>')

bootstrap='''() => {
  notice('');
  if(!crypto.randomUUID){Object.defineProperty(crypto,'randomUUID',{value:()=>'00000000-0000-4000-8000-'+Math.random().toString(16).slice(2).padEnd(12,'0').slice(0,12)});}
  configured=true;
  window.mockActions=[];
  window.__downloads=[];
  download=(kind,format='pdf')=>window.__downloads.push([kind,format]);
  state={tier:'free',email:'verified@example.com',credits:0,expiresAt:new Date(Date.now()+86400000).toISOString(),
   guided:{completed:9,total:10,question:{id:'gaps',kind:'single',text:'What would you like to improve?',options:['Leadership','Interview confidence'],minSelections:1},finished:false},
   freeReadiness:{ready:false,missing:['Area to develop']},freeReportReady:false,freeReport:null,readiness:{ready:false,missing:[]},
   creditsGranted:0,warning:'',expired:false,messages:[{role:'assistant',content:'Welcome to Career Buddy. Your answers and progress are saved to your verified email.'}]};
  api=async(action,data)=>{
   window.mockActions.push(action);
   if(action==='quick')return {state:{...state,guided:{completed:10,total:10,question:null,finished:true},freeReadiness:{ready:true,missing:[]},freeReportReady:true}};
   if(action==='freeReport')return {state:{...state,freeReport:{profileSummary:'Example professional profile summary with useful context.',targetCompetencies:['Leadership','Communication','Industry expertise'],nextSteps:['Review your role','Speak to peers','Build evidence','Practise interviews','Plan learning'],furtherAssessment:['Evidence of team delivery','Technical capability']}}};
   if(action==='mockPurchase')return {state:{...state,tier:'coach',credits:15,creditsGranted:15,warning:'',expired:false},notice:'Test coaching activated.'};
   if(action==='chat')return {state:{...state,credits:14,messages:[...state.messages,{role:'user',content:data.message,at:Date.now()},{role:'assistant',content:'Practise relevant professional skills and gather concrete examples.',at:Date.now()}]}};
   throw Error('Unmocked action '+action);
  };
  show('Free');paint();
}'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width,height,label in [(1400,900,'desktop'),(390,844,'mobile')]:
        page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
        errors=[]
        page.on('pageerror',lambda exc: errors.append(str(exc)))
        page.set_content(html,wait_until='load')
        page.evaluate(bootstrap)
        page.locator('#freeQuestion input[type=radio]').first.check()
        page.locator('#freeQuestion button.primary').click()
        page.wait_for_function("document.querySelector('#freeQuestion button.primary')?.textContent.includes('Generate free snapshot')", timeout=4000)
        btn=page.locator('#freeQuestion button.primary')
        assert btn.is_enabled(), 'Free Snapshot CTA remains disabled after last quick answer'
        btn.click()
        page.wait_for_function("document.querySelector('#screenSnapshot') && !document.querySelector('#screenSnapshot').classList.contains('hidden')")
        assert page.locator('#snapshotDownload').is_visible()
        page.locator('#snapshotDownload').click()
        assert page.evaluate('window.__downloads.length')==1
        assert page.evaluate("window.__downloads[0][0]")=='free'
        # A direct-coaching user does not need to complete free assessment.
        page.evaluate("() => {state={...state,tier:'free',credits:0,freeReport:null,freeReportReady:false};goCoach();}")
        assert page.locator('#screenCoachOffer').is_visible()
        page.locator('#activateIntro').click()
        page.wait_for_function("!document.querySelector('#screenCoach').classList.contains('hidden')")
        assert page.locator('#chatInput').is_enabled(), 'Coach text box stays disabled after intro activated'
        assert page.locator('#chatSend').is_enabled(), 'Coach Send stays disabled after intro activated'
        assert page.locator('#chatMessages').is_hidden(), 'Empty giant panel must be hidden'
        assert page.locator('#coachPrompts').is_visible()
        page.locator('[data-coach-prompt]').first.click()
        assert page.locator('#chatInput').input_value().startswith('What skills')
        page.locator('#chatSend').click()
        page.wait_for_function("document.querySelector('#chatMessages').textContent.includes('Practise relevant professional skills')")
        assert page.locator('#chatInput').is_enabled(), 'After an AI response, the composer remains disabled'
        assert page.locator('#coachPrompts').is_hidden()
        assert page.locator('#chatMessages').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Horizontal overflow'
        assert not errors, errors
        print(f'{label}: free-generation click, download, direct intro, prompt, chat completion, responsive width ALL PASS')
        # Separate first-chat screenshot
        page.evaluate("() => {state={...state,messages:[]};show('Coach');paint();notice('');}")
        page.screenshot(path=str(root.parent/f'Career_Buddy_V5_1_Coach_{label}.png'),full_page=True)
        page.close()
    browser.close()
