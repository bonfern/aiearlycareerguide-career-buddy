"""Offline browser verification: both dashboards, email OTP entry, filters, denial.
Uses mocked API only; no live Firebase, Razorpay or Resend calls.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json
root=Path(__file__).resolve().parents[1]
basecss=(root/'info.css').read_text()+'\n'+(root/'feedback-admin.css').read_text()
mockdata={'range':{'from':'2026-10-01','to':'2026-10-31','timezone':'Asia/Kolkata','grain':'month','conversionWindow':'30','generatedAt':1793530000000,'provisional':True,'unmaturedCohortUsers':2},'summary':{'freeCompleted':4,'premiumBuyers':2,'buddyBuyers':1,'premiumCouponUsers':0,'buddyCouponUsers':1,'premiumReportsCompleted':1,'coachingActiveUsers':1,'paidFromFreePremium':1,'paidFromFreeBuddy':1,'paidFromFreeAny':2,'freeToPremiumPct':25,'freeToBuddyPct':25,'freeToAnyPct':50,'refillPurchases':1,'grossReceiptsInr':1396},'series':[{'period':'2026-10','free':4,'premiumPaid':2,'buddyPaid':1,'premiumComplimentary':0,'buddyComplimentary':1,'refillsPaid':1,'revenueInr':1396}],'notes':['Coupons excluded from paid conversion.']}
feedback={'items':[{'id':'a'*48,'stage':'free','rating':4,'comment':'Easy to follow','category':'content','status':'visible','createdAt':1793530000000,'email':'test@example.com'}],'nextCursor':None}
jsmock=r'''() => {
 window.calls=[];window.signedIn=false;
 window.fetch=async (url, options={}) => {
  const u=new URL(url,'https://local.test');const action=u.searchParams.get('action');window.calls.push({action,method:options.method||'GET',body:options.body?JSON.parse(options.body):null,grain:u.searchParams.get('grain')});
  let status=200,body={};
  if(action==='adminConfig')body={configured:true,adminEnabled:true,privatePreview:false,consentVersion:'career-buddy-privacy-2026-10-27'};
  else if(action==='adminState') {if(window.signedIn)body={ok:true,email:'test@example.com'};else{status=401;body={error:'Verify your email to start or resume.'}}}
  else if(action==='adminRequestCode')body={sent:true};
  else if(action==='adminVerifyCode'){window.signedIn=true;body={state:{email:'test@example.com'}};}
  else if(action==='feedbackList')body=window.feedbackMock;
  else if(action==='analyticsSummary')body=window.analyticsMock;
  else if(action==='feedbackModerate')body={ok:true};
  else {status=404;body={error:'Unexpected mock API action: '+action}}
  return {ok:status===200,status,json:async()=>body};
 };
}'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for pagefile,jsfile in [('feedback-admin.html','feedback-admin.js'),('analytics-admin.html','analytics-admin.js')]:
  for width in [1280,390,320]:
   page=browser.new_page(viewport={'width':width,'height':850})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   shell=(root/pagefile).read_text()
   shell=re.sub(r'<script[^>]*></script>','',shell)
   shell=re.sub(r'<link[^>]*>','',shell)
   shell=shell.replace('src="/brand-logo.webp"','src="data:image/gif;base64,R0lGODlhAQABAAAAACw="')
   page.set_content(shell,wait_until='load')
   page.add_style_tag(content=basecss+'\n'+((root/'analytics-admin.css').read_text() if pagefile.startswith('analytics') else ''))
   page.evaluate(jsmock)
   page.evaluate('window.feedbackMock='+json.dumps(feedback)+';window.analyticsMock='+json.dumps(mockdata))
   page.add_script_tag(content=(root/'admin-auth.js').read_text())
   page.add_script_tag(content=(root/jsfile).read_text())
   page.get_by_role('heading',name='Administrator sign-in').wait_for()
   assert page.locator('#adminEmail').is_visible(),f'Email input missing on {pagefile}'
   page.locator('#adminEmail').fill('test@example.com')
   page.locator('#adminPrivacy').check()
   page.locator('#adminAdult').check()
   page.locator('#adminSendCode').click()
   page.locator('#adminOtp').wait_for(state='visible')
   page.locator('#adminOtp').fill('123456')
   page.locator('#adminVerifyCode').click()
   page.wait_for_function("!document.getElementById('adminContent').hidden")
   if pagefile.startswith('feedback'):
    page.get_by_text('Easy to follow').wait_for()
    page.get_by_role('button',name='Hide').click()
    page.get_by_role('button',name='Restore').wait_for()
    assert page.evaluate('window.calls.some(x=>x.action === "feedbackModerate")')
   else:
    page.get_by_text('Completed free snapshots',exact=True).wait_for()
    assert '4' in page.locator('#kpiCards').inner_text()
    assert '25.0%' in page.locator('#conversionBars').inner_text()
    page.get_by_role('button',name='Week').click()
    page.wait_for_function("window.calls.some(x=>x.action === 'analyticsSummary' && x.grain === 'week')")
    page.locator('#conversionWindow').select_option('7')
    page.locator('#applyFilters').click()
    page.wait_for_function("window.calls.filter(x=>x.action === 'analyticsSummary').length >= 3")
   assert not errors,errors
   assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),(pagefile,width)
   assert page.evaluate('window.calls.some(x=>x.action === "adminRequestCode")')
   assert page.evaluate('window.calls.some(x=>x.action === "adminVerifyCode")')
   print('PASS',pagefile,width,'email OTP, authenticated dashboard and controls')
   page.close()
 browser.close()
