"""Isolated browser mock for V5.8 staged assessment generation: no external services."""
from pathlib import Path
import base64,re
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="/style\.css(?:\?[^\"]*)?"/>','<style>'+(root/'style.css').read_text()+'</style>',html)
html=re.sub(r'<script defer src="/app\.js(?:\?[^\"]*)?"></script>','',html)
for f in ['brand-logo.webp','career-welcome.webp','career-coaching.webp']:
 html=html.replace('/'+f,'data:image/webp;base64,'+base64.b64encode((root/f).read_bytes()).decode())
html=html.replace('</body>','<script>'+(root/'app.js').read_text()+'</script></body>')
mock=r'''() => {
 configured=true; if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-000000000000'});
 state={email:'tester@example.com',tier:'paid',credits:60,creditsGranted:60,expiresAt:new Date(Date.now()+86400000).toISOString(),
  freeReport:{version:4,profileSummary:'Saved snapshot'},profile:{targetRole:'Director of Process Excellence'},
  assessment:{started:false,preparationStep:0,answered:0,total:0,question:null},resumeDecision:'skip',messages:[]};
 window.stageCalls=0;window.failSecond=true;
 api=async (action,body)=>{
  if(action!=='assessmentStart')throw Error('Unexpected API call: '+action);
  stageCalls++;
  if(stageCalls===2&&failSecond){failSecond=false;throw Error('Question stage 2 was interrupted. Your earlier progress is saved.');}
  const stage=Math.min(3,state.assessment.preparationStep+1);
  state={...state,assessment:stage===3?{
   started:true,preparationStep:0,total:12,answered:0,finished:false,competencies:[{name:'Strategic planning',type:'technical'}],
   question:{id:'s1-q1',text:'How would you choose a project to improve performance?',competency:'Strategic planning',kind:'knowledge',options:['Option A','Option B','Option C','Option D','Not sure'],number:1,total:12}
  }:{started:false,preparationStep:stage,answered:0,total:0,question:null}};
  return {state,completed:stage===3};
 };
 show('Paid');paint();
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,label in [(1280,'desktop'),(390,'mobile')]:
  page=browser.new_page(viewport={'width':width,'height':880})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,wait_until='load');page.evaluate(mock)
  page.get_by_role('button',name='Prepare my competency assessment').click()
  
  page.wait_for_function('window.stageCalls>=2 && !loading',timeout=7000)
  assert page.evaluate('state.assessment.preparationStep')==1
  assert 'Question stage 2 was interrupted' in page.locator('#paidQuestion').inner_text()
  assert 'Retry / resume preparation' in page.locator('#paidQuestion').inner_text()
  assert page.evaluate('stageCalls')==2
  page.get_by_role('button',name='Retry / resume preparation').click()
  page.wait_for_function('!loading && state.assessment.started')
  assert page.evaluate('stageCalls')==4
  assert page.locator('text=How would you choose a project').is_visible()
  assert not errors,errors
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  print(label,'stage 2 recovery, no repeated stage 1, responsive: PASS')
  page.close()
 browser.close()
