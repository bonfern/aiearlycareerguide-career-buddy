import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkPackEligibility} from '../api/_lib/domain.js';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
test('welcome contains exactly one free discovery entry option, no coaching shortcut',()=>{
 const ids=[...html.matchAll(/<button id="(choose\w+)"/g)].map(m=>m[1]);
 assert.deepEqual(ids,['chooseAssessment']);
 assert.match(html,/Free Career Discovery/);
 assert.match(html,/Premium Career Assessment/);
 assert.match(html,/Get my free career snapshot/);
 assert.doesNotMatch(html,/id="chooseCoach"/);
});
test('snapshot offers two follow-up choices, both preserving prior answers',()=>{
 assert.match(html,/id="snapshotUpgrade"/);
 assert.match(html,/id="snapshotCoach"/);
 assert.match(html,/Your discovery answers and free snapshot carry over automatically/);
 assert.match(app,/snapshotCoach'\)\.onclick=goCoach/);
 assert.match(app,/snapshotUpgrade'\)\.onclick=async/);
});
test('coaching pack and refills require saved free assessment',()=>{
 assert.throws(()=>checkPackEligibility({tier:'free'},'intro'),/free career snapshot/);
 assert.equal(checkPackEligibility({tier:'free',freeReport:{version:2}},'intro'),'coach');
 assert.throws(()=>checkPackEligibility({tier:'coach',creditsGranted:15},'standard'),/free career snapshot/);
 assert.equal(checkPackEligibility({tier:'coach',freeReport:{version:2},creditsGranted:15},'standard'),'coach');
 assert.throws(()=>checkPackEligibility({tier:'free'},'starter'),/free snapshot/);
 assert.equal(checkPackEligibility({tier:'free',freeReport:{version:2}},'starter'),'paid');
});
test('server guards chat and retains free snapshot context in prompting',()=>{
 assert.match(server,/if\(!s\.freeReport&&!s\.report\)fail\(403/);
 assert.match(server,/freeSnapshotSummary:reservation\.freeReport\?\.profileSummary/);
 assert.match(server,/freeReport:s\.freeReport\|\|null,messages/);
});
test('verified email can save chosen premium/free intent and restore it',()=>{
 assert.match(server,/async function setJourney/);
 assert.match(server,/\['free','premium'\]/);
 assert.match(server,/journeyPreference:body\.journey/);
 assert.match(server,/action==='setJourney'/);
 assert.match(app,/flow=state\.journeyPreference\|\|'free'/);
});
test('paid route has same free foundation, without repeated screening',()=>{
 assert.match(app,/if\(!state\.freeReport\)\{show\('Free'\)/);
 assert.match(app,/flow==='premium'\)show\('Upgrade'\)/);
 assert.match(server,/paid&&s\.freeReport\?'paid':'free'/);
 assert.match(html,/Your free answers are already saved/);
});
