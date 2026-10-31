"""Regression for dashboard root paths plus actual dashboard code with mocked API.

The source paths and the strict Vercel CSP are checked statically. The actual
JavaScript runs in Chromium with mocked responses; this is not a production test.
"""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
html=(root/'feedback-admin.html').read_text()
js=(root/'feedback-admin.js').read_text()
vercel=(root/'vercel.json').read_text()
assert 'base-uri \'none\'' in vercel, 'CSP policy should not be weakened'
assert '<base ' not in html, 'Do not use a base tag blocked by the CSP'
assert '"source":"/admin/feedback"' in vercel, 'Rewrite must remain configured'
for asset in ('favicon.ico','info.css','feedback-admin.css','feedback-admin.js','brand-logo.webp'):
    assert f'"/{asset}' in html, f'{asset} must be root-absolute'
for local in ('href="/"','href="/privacy.html"','href="/contact.html"'):
    assert local in html, f'Incorrect admin navigation: {local}'
assert '`/api/service?action=${action}`' in js,'Moderation API must use root path'
assert "'/api/service?action=feedbackList'" in js,'Load API must use root path'

# Offline UI execution. Remove external resources, use local original styles,
# and run the actual JavaScript. Test both successful and forbidden admin access.
shell=re.sub(r'<link[^>]+rel="stylesheet"[^>]*>','',html)
shell=re.sub(r'<script defer src="/feedback-admin\.js[^\"]*"></script>','',shell)
shell=re.sub(r'<link rel="icon"[^>]*>','',shell)
shell=shell.replace('<img src="/brand-logo.webp"','<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="')
sample={'id':'a'*48,'stage':'premium','rating':2,'category':'depth',
        'comment':'More examples needed','createdAt':1793538889999,
        'updatedAt':1793538889999,'status':'visible','email':'sample@example.org'}
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for permission in ('allow','deny'):
        page=browser.new_page(viewport={'width':390,'height':844})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content(shell,wait_until='load')
        page.add_style_tag(content=(root/'info.css').read_text()+'\n'+(root/'feedback-admin.css').read_text())
        response={'items':[sample],'nextCursor':None} if permission=='allow' else {'error':'Administrator access required.'}
        page.evaluate('''({permission,response}) => {
            window.__calls=[];
            window.fetch=async (url,options={}) => {
                window.__calls.push([url, options.method || 'GET']);
                const body = options.method === 'POST' ? {ok:true} : response;
                return {ok: permission==='allow' || options.method==='POST', status: permission==='allow'?200:403,
                  json:async()=>body};
            };
        }''',{'permission':permission,'response':response})
        page.add_script_tag(content=js)
        page.wait_for_function("document.getElementById('adminStatus').textContent !== 'Checking access…'")
        assert page.locator('header.top').evaluate('(x)=>getComputedStyle(x).backgroundColor')=='rgb(20, 33, 67)'
        assert page.evaluate('window.__calls[0][0]')=='/api/service?action=feedbackList'
        if permission=='allow':
            assert 'More examples needed' in page.locator('body').inner_text()
            page.get_by_role('button',name='Hide').click()
            page.get_by_role('button',name='Restore').wait_for()
            assert any('/api/service?action=feedbackModerate' in u for u,_ in page.evaluate('window.__calls'))
        else:
            assert 'Administrator access required.' in page.locator('#adminStatus').inner_text()
            assert page.locator('#adminContent').is_hidden()
        assert not errors,errors
        page.close()
        print('PASS dashboard actual JS/CSS mocked admin:',permission)
    browser.close()
print('PASS root-absolute assets, navigation, API paths and restrictive CSP')
