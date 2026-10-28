import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {EMPTY_PROFILE,freeReadiness} from '../api/_lib/domain.js';
import {FREE_QUESTION_IDS,NO_EXPERIENCE,guidedProgress,validateQuickAnswer,addQuickAnswer,rewindFreeAnswers,isObviousNonsense} from '../api/_lib/quickflow.js';
import {FREE_SNAPSHOT_VERSION,validPersonalInsights,validRoleGuidance,buildSnapshotV2,isSnapshotV2} from '../api/_lib/free-snapshot-content.js';
import {buildFreeSnapshotPdf} from '../api/_lib/free-snapshot-pdf.js';

const guidance={targetCompetencies:[
 {title:'SQL and data preparation',bullets:['Clean and join tables from multiple business systems into useful analysis-ready data sets.','Produce a documented SQL extract that can be checked and reliably reproduced by others.']},
 {title:'Dashboards and data storytelling',bullets:['Build clear reporting pages that help teams understand important changes and act on them.','Use a Power BI dashboard to show trends and explain what decisions the data supports.']},
 {title:'Statistics and experimentation',bullets:['Use basic statistical concepts to distinguish meaningful patterns from random variation.','Explain findings from an experiment and the uncertainty around its results to a team.']},
 {title:'Explaining insights to stakeholders',bullets:['Translate analysis into plain language for people who are not technical experts.','Present a clear recommendation with evidence and the practical consequences for a business team.']}
],nextSteps:Array.from({length:5},(_,i)=>({title:`Practical action ${i+1}`,bullets:[`Create a specific example showing one skill relevant to the selected data analyst goal number ${i+1}.`,`Write down your role in the example, your approach and a result or learning for exercise ${i+1}.`]}))};

test('nine free questions are no-cost deterministic flow with two additional insight prompts',()=>{
 assert.equal(FREE_SNAPSHOT_VERSION,5);
 assert.equal(FREE_QUESTION_IDS.length,9);
 assert.deepEqual(FREE_QUESTION_IDS.slice(-2),['applicationDepth','evidenceExample']);
 let p={...EMPTY_PROFILE},answers={};
 const response={employmentStatus:'Employed full-time',goal:'Change careers',targetRole:'Data Analyst',currentRole:'Operations Coordinator',experience:'1–3 years',roleExperience:['Dashboards and data storytelling','Explaining insights to stakeholders'],gaps:'SQL and data preparation',applicationDepth:'Applied independently in work, studies or projects',evidenceExample:'I created a Power BI dashboard to help my operations team review service delays.'};
 for(const id of FREE_QUESTION_IDS){
  const q=guidedProgress(p,answers,[],'free').question;
  assert.equal(q.id,id);
  const a=validateQuickAnswer(q,{value:response[id]});p=addQuickAnswer(p,q,a);answers[id]=a.value;
 }
 assert.ok(guidedProgress(p,answers,[],'free').finished);
 assert.ok(freeReadiness(p).ready);
 assert.equal(p.applicationDepth,response.applicationDepth);
 assert.equal(p.evidenceExample,response.evidenceExample);
 const back=rewindFreeAnswers(answers,{},p);
 assert.equal(back.previousId,'evidenceExample');
 assert.equal(guidedProgress(back.profile,back.answers,[],'free').question.id,'evidenceExample');
});

test('beginners can honestly report no experience and skip example; previous works after skipping',()=>{
 let p={...EMPTY_PROFILE},a={},skips=[];
 const response={employmentStatus:'Student',goal:'Explore career options',targetRole:'Data Analyst',currentRole:'BSc Statistics',experience:'No experience yet',roleExperience:[NO_EXPERIENCE],gaps:'Not sure yet',applicationDepth:'Just exploring; no related learning or practice yet'};
 for(const id of FREE_QUESTION_IDS.slice(0,-1)){
  const q=guidedProgress(p,a,skips,'free').question;
  assert.equal(q.id,id);
  if(id==='applicationDepth')assert.match(q.text,/explored|prepared/i);
  const validated=validateQuickAnswer(q,{value:response[id]});p=addQuickAnswer(p,q,validated);a[id]=validated.value;
 }
 const optional=guidedProgress(p,a,skips,'free').question;
 assert.equal(optional.id,'evidenceExample');assert.equal(optional.optional,true);
 skips.push(optional.id);
 assert.equal(guidedProgress(p,a,skips,'free').finished,true);
 const back=rewindFreeAnswers(a,{},p,skips);
 assert.equal(back.previousId,'evidenceExample');assert.deepEqual(back.skips,[]);
 assert.equal(guidedProgress(back.profile,back.answers,back.skips,'free').question.id,'evidenceExample');
 assert.ok(freeReadiness(p).ready);
});

test('obvious gibberish and non-specific personal praise do not become evidence',()=>{
 const q={id:'evidenceExample',kind:'text',minLength:18,maxLength:300,example:true};
 for(const nonsense of ['asdfghqwertyabcdefghijkl','blah blah blah blah blah','aaaaaaaaaaaaaaaaaaa','I am good at everything and very intelligent']){
  assert.throws(()=>validateQuickAnswer(q,{value:nonsense}),/real project|specific task/i,nonsense);
 }
 assert.ok(isObviousNonsense('asdfghqwertyabcdefghijkl'));
 assert.equal(validateQuickAnswer(q,{value:'I created a dashboard to compare weekly sales trends.'}).value,'I created a dashboard to compare weekly sales trends.');
});

test('personalised report opens with goal, role skills and self-reported exposure, and ends with further evaluation',()=>{
 assert.ok(validRoleGuidance(guidance));
 const p={...EMPTY_PROFILE,goal:'Change careers',targetRole:'Data Analyst',roleExperience:['Dashboards and data storytelling'],applicationDepth:'Applied independently in work, studies or projects',evidenceExample:'I created a dashboard to analyse the most common service delays in my team.',gaps:['SQL and data preparation']};
 const insight={transferableAdvantage:'Your operational reporting experience may help you ask useful analytical questions and communicate the value of dashboards.',careerAlignment:'You described independent dashboard work, which connects to the target role; the specific example does not establish SQL experience.',nextBestMoves:['Prepare a short case study explaining the service delays you analysed and which decisions your dashboard improved.','Use a public dataset to write three SQL joins and compare the results against your existing dashboard.']};
 assert.ok(validPersonalInsights(insight));
 const r=buildSnapshotV2(p,guidance,insight);
 assert.ok(isSnapshotV2(r));
 assert.match(r.profileSummary,/Data Analyst/);
 assert.match(r.profileSummary,/Dashboards and data storytelling/);
 assert.doesNotMatch(r.profileSummary,/untested|assessment|paid|not verified|testing/i);
 assert.equal(r.reportedExposure.length,1);
 assert.equal(r.nextBestMoves.length,2);
 assert.equal(r.furtherAssessment.length,3);
 const pdf=buildFreeSnapshotPdf(r).toString('latin1');
 assert.match(pdf,/Your transferable advantage/);
 assert.match(pdf,/Your career alignment/);
 assert.match(pdf,/Your next best moves/);
 const start=pdf.indexOf('Your career goal and starting point'),bottom=pdf.indexOf('What a deeper assessment could reveal');
 assert.ok(start>0&&bottom>start);
 assert.match(pdf,/It is not a verified competency score/);
});

test('same configured free model synthesises private insight once at report generation, with role-only shared caching',()=>{
 const source=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 const quick=source.slice(source.indexOf('async function quickAnswer('),source.indexOf('async function startAssessment('));
 assert.doesNotMatch(quick,/aiJson\(|assessmentAI\(/);
 const free=source.slice(source.indexOf('async function freeReport('),source.indexOf('function previewCoupons('));
 assert.match(free,/buddyRoleSnapshotGuidanceV3/);
 assert.match(free,/personalisedSnapshotPrompt/);
 assert.match(free,/free-personal-insight/);
 assert.match(free,/usageSummary:summary/);
 assert.match(free,/if\(s\.freeReport\)return \{existing:s\}/);
 assert.match(free,/profile:privateProfile/);
 assert.doesNotMatch(free.slice(free.indexOf('roleRef.set'),free.indexOf('const free=buildSnapshotV2')),/roleRef\.set\(\{[^}]*privateProfile/);
});
