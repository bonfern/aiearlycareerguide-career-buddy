import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');

test('async state unlocks dynamically-rendered report button and chat controls',()=>{
 assert.match(js,/finally\s*\{loading=false;syncBusyControls\(\);\$\('processingOverlay'\)\?\.classList\.add\('hidden'\);\}/);
 assert.match(js,/button\.dataset\.asyncAction='1'/);
 assert.match(js,/b\.disabled=loading/);
 assert.match(js,/const blocked=loading\|\|Number\(state\.credits\|\|0\)<=0\|\|Boolean\(state\.expired\)/);
});
test('coaching is restricted until a free snapshot exists, then is available with either pack',()=>{
 assert.match(js,/function goCoach\(\).*?if\(!state\.freeReport&&!state\.reportGenerated\)/);
 assert.match(html,/id="chooseAssessment"/);
 assert.doesNotMatch(html,/id="choosePremium"/);
 assert.match(html,/id="snapshotCoach"/);
 assert.doesNotMatch(html,/id="chooseCoach"/);
 assert.doesNotMatch(html,/No assessment required/);
});
test('first-time coaching has compact suggested questions instead of blank fixed panel',()=>{
 assert.match(html,/id="coachPrompts"/);
 assert.match(html,/data-coach-prompt=/);
 assert.match(js,/pane\.classList\.toggle\('hidden',!hasConversation\)/);
 assert.match(css,/\.messages\{min-height:0;height:auto/);
});
