"""Offline Chromium UI regression for Premium Assessment Next-button navigation.
Does not call production APIs, Firebase, or payment services.
"""
from pathlib import Path
import base64
import re
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
for asset in ['career-coaching.webp', 'career-welcome.webp', 'brand-logo.webp']:
    data = 'data:image/webp;base64,' + base64.b64encode((root / asset).read_bytes()).decode()
    html = html.replace('./' + asset, data)
    css = css.replace("url('./" + asset + "')", f"url('{data}')")
html = re.sub(r'<link rel="stylesheet" href="\./style\.css(?:\?[^"]*)?"\s*/>', '<style>' + css + '</style>', html)
html = re.sub(r'<script defer src="\./app\.js(?:\?[^"]*)?"\s*></script>', '', html)
app = (root / 'app.js').read_text().replace('const uuid=()=>crypto.randomUUID();', "const uuid=()=> '00000000-0000-4000-8000-' + (++window.testRequestCounter).toString().padStart(12,'0');window.testRequestCounter=0;")
html = html.replace('</body>', '<script>' + app + '</script></body>')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    for width in (1280, 390):
        page = browser.new_page(viewport={'width': width, 'height': 800})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_default_timeout(7000)
        page.set_content(html, wait_until='load')
        page.wait_for_function("document.querySelector('#processingOverlay').classList.contains('hidden')")
        page.evaluate("""() => {
          const questions = Array.from({length: 12}, (_, i) => ({
            id: 'question-' + (i + 1), competency: 'Professional judgement',
            kind: 'scenario', text: 'Scenario question ' + (i + 1),
            options: ['Option A', 'Option B', 'Option C', 'Option D', 'Not sure'],
            number: i + 1, total: 12
          }));
          const assessmentAt = answered => ({
            started:true, total:12, answered, finished:answered===12,
            competencies:[{name:'Professional judgement'}],
            question:questions[answered] || null
          });
          state = {
            id:'test',email:'test@example.org',tier:'paid',paymentMode:'razorpay_live',
            journeyPreference:'premium',freeReport:{version:6},reportGenerated:false,
            profile:{targetRole:'Operations Director'},assessment:assessmentAt(0),
            credits:50,messages:[],resumeReviews:[],packs:[]
          };
          window.mockPaid = {submissions:[],failOnce:false};
          api = async (action, body) => {
            if (action !== 'assessmentAnswer') throw Error('Unexpected action: ' + action);
            window.mockPaid.submissions.push({...body});
            if (window.mockPaid.failOnce) {
              window.mockPaid.failOnce = false;
              throw Error('Temporary save error. Please try again.');
            }
            const q = state.assessment.question;
            if (body.questionId !== q.id) throw Error('Question mismatch');
            if (body.choice !== 0) throw Error('Wrong option index');
            return {state:{...state,assessment:assessmentAt(state.assessment.answered+1)}};
          };
          show('Paid'); paint();
        }""")
        card = page.locator('#paidQuestion')
        next_button = lambda: card.get_by_role('button', name='Save answer and continue')
        assert 'Scenario question 1' in card.inner_text()
        next_button().click()
        assert 'Select one option to continue' in card.inner_text()
        assert page.evaluate('mockPaid.submissions.length') == 0
        card.locator('input[type=radio]').first.check()
        next_button().click()
        page.wait_for_function('state.assessment.answered === 1')
        assert 'Scenario question 2' in card.inner_text()
        # On network failure, show an actionable inline message and keep same answer.
        page.evaluate('window.mockPaid.failOnce = true')
        card.locator('input[type=radio]').first.check()
        next_button().click()
        page.wait_for_function("document.querySelector('#paidQuestion .question-error').textContent.includes('Temporary save error')")
        assert page.evaluate('state.assessment.answered') == 1
        assert card.locator('input[type=radio]').first.is_checked()
        failed_request = page.evaluate('mockPaid.submissions.at(-1).requestId')
        next_button().click()
        page.wait_for_function('state.assessment.answered === 2')
        assert page.evaluate('mockPaid.submissions.at(-1).requestId') == failed_request
        for i in range(3, 13):
            card.locator('input[type=radio]').first.check()
            next_button().click()
            page.wait_for_function(f'state.assessment.answered === {i}')
        assert 'Your competency assessment is complete' in card.inner_text()
        assert card.get_by_role('button', name='Generate my detailed career report').count() == 1
        assert not errors, errors
        print(f'{width}px: validation, next, error/retry, idempotency and all 12 questions PASS')
        page.close()
    browser.close()
