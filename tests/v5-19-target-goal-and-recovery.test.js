import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FREE_QUESTION_IDS,FREE_QUESTIONS,freeIntakeComplete,applyFreeAnswers} from '../api/_lib/free-intake.js';
import {guidedProgress,validateQuickAnswer,rewindFreeAnswers,validateSkip,isObviousNonsense} from '../api/_lib/quickflow.js';
import {freeReadiness,checkPackEligibility,EMPTY_PROFILE} from '../api/_lib/domain.js';
import {buildSnapshotV2,validRoleGuidance,isSnapshotV2,cacheRoleKey} from '../api/_lib/free-snapshot-content.js';
import {buildFreeSnapshotPdf} from '../api/_lib/free-snapshot-pdf.js';
const base={
 careerStage:'College / University Student',careerSituation:['I want to switch to a different role',"I'm unsure about my next career move"],
 interestFields:['Data & Analytics','Artificial Intelligence (AI)'],personalStrengths:['Solving problems','Analyzing data and information'],
 enjoyedWork:['Working with data and numbers','Learning and researching new topics'],workEnvironment:['Team-oriented and collaborative'],
 educationLevel:"Bachelor's Degree",existingSkills:'Excel, Power BI',careerAmbition:'Build future-ready skills',learningTime:'4-6 hours',
 changeComfort:'Moderately comfortable',careerValues:['Continuous learning and growth','Healthy work-life balance'],targetGoalRole:'Data Analyst'};
function flow(values=base, skips=[]){let profile={...EMPTY_PROFILE},answers={},extras={},skipped=[];
 for(const id of FREE_QUESTION_IDS){const q=guidedProgress(profile,answers,skipped,'free').question;assert.equal(q?.id,id);
  if(skips.includes(id)){assert.equal(q.optional,true);validateSkip(q);skipped.push(id);}
  else{const raw=values[id],value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw.value:raw;
   const other=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw.other:'';
   const a=validateQuickAnswer(q,{value,other});answers[id]=a.value;extras[id]=a.other;}
  profile=applyFreeAnswers(answers,extras,skipped);
 }
 return {profile,answers,extras,skipped};
}
const guidance={targetCompetencies:Array.from({length:4},(_,i)=>({title:`Career skill ${i+1}`,bullets:[`Apply this ability through realistic examples of the career domain task ${i+1}.`,`Prepare a documented work sample to make this professional capability visible ${i+1}.`]})),nextSteps:Array.from({length:5},(_,i)=>({title:`Action ${i+1}`,bullets:[`Practise a relevant skill using a small dataset or classroom scenario number ${i+1}.`,`Record your method and the specific improvement you would try next time ${i+1}.`]}))};
test('13-question flow ends with required Target Career Goal or Role',()=>{
 assert.equal(FREE_QUESTIONS.length,13);assert.equal(FREE_QUESTION_IDS.at(-1),'targetGoalRole');
 const q=FREE_QUESTIONS.at(-1);assert.match(q.text,/specific career goal or role/i);assert.equal(Boolean(q.optional),false);
 assert.throws(()=>validateSkip(q),/needed/);
 assert.ok(FREE_QUESTION_IDS.includes('careerAmbition'));
});
test('free answers finish with a specific target role and no extra AI calls',()=>{
 const f=flow();assert.ok(freeIntakeComplete(f.answers,f.skipped));
 assert.ok(guidedProgress(f.profile,f.answers,f.skipped,'free').finished);
 assert.equal(f.profile.freeIntakeVersion,19);
 assert.equal(f.profile.targetRole,'Data Analyst');assert.equal(f.profile.targetGoalRole,'Data Analyst');
 assert.equal(f.profile.experience,'No experience yet');assert.deepEqual(f.profile.personalStrengths,base.personalStrengths);
 assert.equal(freeReadiness(f.profile).ready,true);assert.ok(validRoleGuidance(guidance));
 const report=buildSnapshotV2(f.profile,guidance);assert.ok(isSnapshotV2(report));
 assert.match(report.profileSummary,/Data Analyst/);assert.match(report.profileSummary,/Solving problems/);
 const pdf=buildFreeSnapshotPdf(report);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
});
test('student can say Still exploring without an invented target role',()=>{
 const f=flow({...base,careerStage:'School Student',existingSkills:undefined,targetGoalRole:'Still exploring'},['existingSkills']);
 assert.equal(f.profile.experience,'No experience yet');assert.match(f.profile.targetRole,/Career paths in Data & Analytics/);
 assert.equal(f.profile.targetGoalRole,'Still exploring');assert.equal(f.profile.assessmentTargetRole,'');
 assert.equal(freeReadiness(f.profile).ready,true);
 assert.match(cacheRoleKey(f.profile.targetRole).role,/career paths in data/);
});
test('career goal rather than job title remains a direction, not invented role',()=>{
 const f=flow({...base,targetGoalRole:'Get promoted'});
 assert.match(f.profile.targetRole,/Career paths in/);assert.equal(f.profile.goal,'Get promoted');
});
test('last question rejects empty and obvious nonsense without an AI call',()=>{
 const q=FREE_QUESTIONS.at(-1);
 for(const response of ['', 'asdfghqwertyabcdefghijkl','xxxxxxxxxxxxx'])assert.throws(()=>validateQuickAnswer(q,{value:response}));
 assert.equal(validateQuickAnswer(q,{value:'Still exploring'}).value,'Still exploring');
 assert.equal(validateQuickAnswer(q,{value:'Data Analyst'}).value,'Data Analyst');
});
test('Q8 optional skills can be skipped; Q13 cannot be skipped',()=>{
 const f=flow(base,['existingSkills']);
 assert.equal(f.profile.existingSkills,'');assert.ok(freeReadiness(f.profile).ready);
 const q=FREE_QUESTIONS.at(-1);assert.throws(()=>validateSkip(q));
});
test('back navigation from last question reinstates the answer field and allows edits',()=>{
 const f=flow();const back=rewindFreeAnswers(f.answers,f.extras,f.profile,f.skipped);
 assert.equal(back.previousId,'targetGoalRole');assert.equal(back.previousValue,'Data Analyst');
 assert.equal(guidedProgress(back.profile,back.answers,back.skips,'free').question.id,'targetGoalRole');
 const changed=applyFreeAnswers({...back.answers,targetGoalRole:'Business Analyst'},back.extras,back.skips);
 assert.equal(changed.targetRole,'Business Analyst');
});
test('Other description survives free intake and back navigation',()=>{
 const f=flow({...base,careerStage:{value:'Other',other:'Intern transitioning to full time work'}});
 assert.equal(f.profile.careerStage,'Intern transitioning to full time work');
 let b=rewindFreeAnswers(f.answers,f.extras,f.profile,f.skipped);
 while(b.answers.careerStage&&Object.keys(b.answers).length>1)b=rewindFreeAnswers(b.answers,b.extras,b.profile,b.skips);
 assert.equal(b.extras.careerStage,'Intern transitioning to full time work');
});
test('premium still requires explicit role selection for verification before purchase',()=>{
 const f=flow();const s={tier:'free',freeReport:{version:5},profile:f.profile};
 assert.throws(()=>checkPackEligibility(s,'starter'),/specific job role/);
 s.profile={...s.profile,assessmentTargetRole:'Data Analyst'};assert.equal(checkPackEligibility(s,'starter'),'paid');
});
test('legacy 12 answers and old optional context allow new target Q13 instead of a crash',()=>{
 const oldAnswers={...base,additionalContext:'Previously noted a preference for data projects'};delete oldAnswers.targetGoalRole;
 const profile=applyFreeAnswers(oldAnswers,{},[]);
 assert.equal(guidedProgress(profile,oldAnswers,[],'free').question.id,'targetGoalRole');
 assert.equal(freeReadiness(profile).ready,false);
 const newAnswers={...oldAnswers,targetGoalRole:'Data Analyst'};
 assert.equal(guidedProgress(applyFreeAnswers(newAnswers,{},[]),newAnswers,[],'free').finished,true);
});
test('server error logs include action without echoing questionnaire text',()=>{
 const server=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 assert.match(server,/action:String\(req\.query\?\.action/);
 assert.match(server,/typeof s\.profile!=='object'/);
 assert.match(server,/version:'5\.19'/);
 assert.match(server,/ENFORCE_FREE_BROWSER_LIMIT==='1'/);
});
