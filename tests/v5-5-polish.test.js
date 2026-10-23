import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
 FREE_SNAPSHOT_VERSION,cacheRoleKey,roleGuidancePrompt,buildSnapshotV2,isSnapshotV2
} from '../api/_lib/free-snapshot-content.js';
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const backend=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');

test('stage navigation resets scroll after layout, focuses heading and handles same-screen next question',()=>{
 assert.match(app,/scrollRestoration='manual'/);
 assert.match(app,/requestAnimationFrame\(\(\)=>/);
 assert.match(app,/\.focus\(\{preventScroll:true\}\)/);
 assert.match(app,/scroller\.scrollTop=0/);
 assert.match(app,/document\.body\.scrollTop=0/);
 assert.match(app,/window\.scrollTo\(0,0\)/);
 assert.match(app,/async function sendQuick[\s\S]*?paint\(\);toPageStart\(current\)/);
 assert.match(app,/Code sent[\s\S]*?toPageStart\('Login'\)/);
});

test('plain-English snapshot guidance uses a separate v3 shared ROLE cache, with no personal information',()=>{
 assert.equal(FREE_SNAPSHOT_VERSION,4);
 assert.match(roleGuidancePrompt,/everyday English/);
 assert.match(roleGuidancePrompt,/actual work artefacts/);
 assert.match(roleGuidancePrompt,/EXACTLY 5 nextSteps/);
 assert.match(roleGuidancePrompt,/EXACTLY TWO distinct bullets/);
 assert.match(backend,/buddyRoleSnapshotGuidanceV3/);
 assert.ok(!backend.includes('buddyRoleSnapshotGuidanceV2'));
 assert.notEqual(cacheRoleKey('Director of Process Excellence').id,cacheRoleKey('Product Manager').id);
});

test('contextual coach prompt opens with skill gap rather than unrelated Product Manager suggestions',()=>{
 const block=app.slice(app.indexOf('function coachOpeningQuestions('),app.indexOf('function paintCoachPrompts('));
 const context=vm.createContext({});
 const suggestions=vm.runInContext(block+'\ncoachOpeningQuestions({profile:{targetRole:"Director of Process Excellence",currentRole:"Process Excellence Manager",gaps:["Strategic planning"],roleExperience:["Lean Six Sigma"]},reportGenerated:false})',context);
 assert.match(suggestions[0].question,/Strategic planning/);
 assert.match(suggestions[0].question,/Director of Process Excellence/);
 assert.equal(suggestions.length,4);
 assert.match(suggestions[1].question,/Director of Process Excellence/);
 assert.ok(suggestions.every(x=>x.question.length<220));
 assert.match(app,/paintCoachPrompts\(\)/);
 assert.match(html,/id="coachContextNote"/);
});

test('exploratory roles and paid reports receive sensible first coaching suggestions',()=>{
 const block=app.slice(app.indexOf('function coachOpeningQuestions('),app.indexOf('function paintCoachPrompts('));
 const context=vm.createContext({});
 const fn=vm.runInContext(block+'\ncoachOpeningQuestions',context);
 const exploring=fn({profile:{targetRole:'Still exploring',currentRole:'Operations Executive'},reportGenerated:false});
 assert.match(exploring[0].question,/which three roles/);
 const paid=fn({profile:{targetRole:'Product Manager',gaps:[]},reportGenerated:true});
 assert.match(paid[0].question,/30\/60\/90-day plan/);
});

test('legacy reports stay readable, but must be refreshed to access updated simpler wording',()=>{
 assert.match(app,/\(state\.freeReport\.version\|\|0\)<4/);
 assert.match(app,/\(r\.version\|\|0\)<4/);
 assert.match(backend,/isSnapshotV2\(s\.freeReport\)/);
});
