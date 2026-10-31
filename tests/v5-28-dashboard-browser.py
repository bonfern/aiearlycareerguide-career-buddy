"""Offline dashboard controls with mocked API; access permissions are tested separately."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,base64
root=Path(__file__).resolve().parents[1]
html=(root/'feedback-admin.html').read_text();styles=(root/'info.css').read_text()+'\n'+(root/'feedback-admin.css').read_text()
html=re.sub(r'<link[^>]*rel="stylesheet"[^>]*>','',html)
html=re.sub(r'<script defer src="(?:\./|/)feedback-admin\.js[^\"]*"></script>','',html)
html=html.replace('<head>','<head><base href="https://feedback.example/">')
logo='data:image/webp;base64,'+base64.b64encode((root/'brand-logo.webp').read_bytes()).decode()
html=html.replace('/brand-logo.webp',logo).replace('</head>','<style>'+styles+'</style></head>')
html=html.replace('</body>','<script>'+(root/'feedback-admin.js').read_text()+'</script></body>')
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':800})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 calls=[]
 def route(request):
  calls.append((request.request.url,request.request.post_data))
  if 'feedbackList' in request.request.url:
   return request.fulfill(status=200,content_type='application/json',body='{"items":[{"id":"'+('a'*48)+'","stage":"premium","rating":2,"category":"depth","comment":"Needs more examples","createdAt":1793538889999,"updatedAt":1793538889999,"status":"visible","email":"sample@example.org"}],"nextCursor":null}')
  if 'feedbackModerate' in request.request.url:return request.fulfill(status=200,content_type='application/json',body='{"ok":true}')
 page.route('**/api/service?*',route)
 page.set_content(html,wait_until='load')
 page.get_by_text('Needs more examples').wait_for()
 assert page.locator('#shownCount').inner_text()=='1'
 page.get_by_role('button',name='Hide').click()
 page.get_by_role('button',name='Restore').wait_for()
 assert any('feedbackModerate' in url for url,_ in calls)
 page.get_by_role('button',name='Restore').click()
 page.get_by_role('button',name='Hide').wait_for()
 assert not errors,errors
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.close();browser.close()
 print('Owner dashboard mock: rendering, hide/restore and mobile layout PASS')
