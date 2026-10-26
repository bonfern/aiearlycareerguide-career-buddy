import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('free-snapshot call to action is visually distinguished within one clickable card',()=>{
 assert.match(html,/<button id="chooseAssessment"[^>]*class="choice-card"[^>]*>[\s\S]*?<b class="snapshot-cta">Get my free career snapshot/);
 assert.match(css,/\.choice-card \.snapshot-cta\s*\{/);
 assert.match(css,/background:var\(--yellow\)/);
 assert.match(css,/font-size:clamp\(15px,1\.35vw,18px\)/);
 assert.match(css,/@media\(max-width:600px\)/);
});
test('CTA continues to use existing free discovery activation; secure coupon validation unchanged',()=>{
 assert.match(js,/chooseAssessment/);
 assert.match(js,/const couponCode=\$\(couponId\)\?\.value\?\.trim\(\)\|\|''/);
 assert.match(html,/style\.css\?v=5\.14/);
});
