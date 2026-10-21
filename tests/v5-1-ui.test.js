import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');

test('async state unlocks dynamically-rendered report button and chat controls',()=>{
 assert.match(js,/finally\s*\{loading=false;syncBusyControls\(\);\}/);
 assert.match(js,/button\.dataset\.asyncAction='1'/);
 assert.match(js,/b\.disabled=loading/);
 assert.match(js,/const blocked=loading\|\|Number\(state\.credits\|\|0\)<=0\|\|Boolean\(state\.expired\)/);
});
test('direct coaching route never requires a free report and preserves empty-credit history',()=>{
 assert.match(js,/function goCoach\(\).*?if\(isCoachActive\(\)\)\{show\('Coach'\);\}/);
 assert.match(html,/id="chooseCoach"/);
 assert.match(html,/No assessment required/);
});
test('first-time coaching has compact suggested questions instead of blank fixed panel',()=>{
 assert.match(html,/id="coachPrompts"/);
 assert.match(html,/data-coach-prompt=/);
 assert.match(js,/pane\.classList\.toggle\('hidden',!hasConversation\)/);
 assert.match(css,/\.messages\{min-height:0;height:auto/);
});
