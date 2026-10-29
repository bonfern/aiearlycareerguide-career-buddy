import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EMPTY_PROFILE,freeReadiness,reportReadiness} from '../api/_lib/domain.js';
import {QUESTIONS,FREE_QUESTION_IDS,guidedProgress,competenciesForRole,NO_EXPERIENCE,validateQuickAnswer,addQuickAnswer} from '../api/_lib/quickflow.js';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');

test.skip('free discovery has nine relevant questions with no industry or career timing prompts [superseded by V5.18 13-question specification]',()=>{
 assert.deepEqual(FREE_QUESTION_IDS,['employmentStatus','goal','targetRole','currentRole','experience','roleExperience','gaps','applicationDepth','evidenceExample']);
 assert.equal(guidedProgress(EMPTY_PROFILE,{},[],'free').total,9);
 assert.ok(!QUESTIONS.some(q=>q.id==='industry'||q.id==='timeframe'));
 assert.match(html,/Nine short questions/);
 assert.match(html,/Question 1 of 9/);
});
test('over 20 years is the highest work experience option and retains accurate range',()=>{
 const experience=QUESTIONS.find(q=>q.id==='experience');
 assert.equal(experience.options.at(-1),'Over 20 years');
 assert.ok(experience.options.includes('13–20 years'));
 assert.ok(!experience.options.includes('13+ years'));
});
test.skip('target-role competency and development choices adapt to role rather than using generic responsibility lists [superseded by V5.18 13-question specification]',()=>{
 const pairs=[
  ['Director of Process Excellence','Lean Six Sigma and process improvement'],
  ['Product Manager','Product strategy and roadmaps'],
  ['Senior Data Analyst','SQL and data preparation'],
  ['HR Business Partner','Talent or workforce planning'],
  ['Primary School Teacher','Teaching and facilitation']
 ];
 for(const [role,expected] of pairs){
  const p={employmentStatus:'Employed full-time',currentRole:'Team Lead',experience:'13–20 years',goal:'Get promoted',targetRole:role};
  const q=guidedProgress(p,{},[],'free').question;
  assert.equal(q.id,'roleExperience');assert.ok(q.options.includes(expected),role);
  assert.ok(q.options.includes('Other'));
  assert.ok(q.options.includes(NO_EXPERIENCE));
  const profile=addQuickAnswer(p,q,validateQuickAnswer(q,{value:[expected]}));
  assert.ok(profile.roleExperience.includes(expected));
  assert.ok(profile.skills.includes(expected));
  const next=guidedProgress(profile,{},[],'free').question;
  assert.equal(next.id,'gaps');assert.ok(next.options.includes(expected));
  assert.ok(!next.options.includes('No hands-on experience yet'));
 }
 assert.notDeepEqual(competenciesForRole('Product Manager'),competenciesForRole('HR Business Partner'));
});
test.skip('an unfamiliar role supports custom experience and a user with no experience can still obtain preliminary snapshot [superseded by V5.18 13-question specification]',()=>{
 const p={employmentStatus:'Between jobs',currentRole:'Graduate',experience:'Less than 1 year',goal:'Change careers',targetRole:'Unusual Emerging Career Role'};
 const q=guidedProgress(p,{},[],'free').question;
 assert.ok(q.options.includes('Other'));
 assert.throws(()=>validateQuickAnswer(q,{value:[NO_EXPERIENCE,q.options[0]]}),/on its own/);
 const own=addQuickAnswer(p,q,validateQuickAnswer(q,{value:['Other'],other:'Specialised archive management'}));
 assert.equal(own.roleExperience[0],'Specialised archive management');
 const none=addQuickAnswer(p,q,validateQuickAnswer(q,{value:[NO_EXPERIENCE]}));
 const gap=guidedProgress(none,{},[],'free').question;
 const completed=addQuickAnswer(none,gap,validateQuickAnswer(gap,{value:'Not sure yet'}));
 assert.equal(freeReadiness(completed).ready,true);
 assert.equal(reportReadiness(completed).ready,false);
});
test('paid readiness does not demand removed timeframe question, but still requires substantial evidence',()=>{
 const p={employmentStatus:'Employed full-time',currentRole:'Programme Lead',experience:'Over 20 years',goal:'Get promoted',targetRole:'Director of Process Excellence',roleExperience:['Transformation programme delivery','Lean Six Sigma and process improvement'],skills:['Transformation programme delivery','Lean Six Sigma and process improvement'],responsibilities:['Experience with Transformation programme delivery'],gaps:['Strategic planning'],constraints:'3 hours per week',achievements:['Led operational transformation for several departments','Improved efficiency by introducing a cross-team dashboard']};
 assert.equal(reportReadiness(p).ready,true);
 assert.equal(freeReadiness(p).ready,true);
});
test('landing offers one free entry and the snapshot offers the two paid next steps',()=>{
 const buttons=[...html.matchAll(/<button id="(choose\w+)"/g)].map(x=>x[1]);
 assert.deepEqual(buttons,['chooseAssessment']);
 assert.match(html,/id="snapshotUpgrade"/);assert.match(html,/id="snapshotCoach"/);
 assert.doesNotMatch(html,/id="choosePremium"/);
 assert.match(app,/\$\('chooseAssessment'\)\.onclick/);
 assert.doesNotMatch(app,/\$\('choosePremium'\)/);
});
