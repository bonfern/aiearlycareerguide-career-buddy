import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FREE_QUESTIONS,FREE_QUESTION_IDS,activeFreeQuestions,isExploringGoal,freeIntakeComplete,applyFreeAnswers} from '../api/_lib/free-intake.js';
import {guidedProgress,validateQuickAnswer,rewindFreeAnswers,isObviousNonsense} from '../api/_lib/quickflow.js';
import {freeReadiness,checkPackEligibility} from '../api/_lib/domain.js';
import {buildSnapshotV2,validRoleGuidance,isSnapshotV2,cacheRoleKey} from '../api/_lib/free-snapshot-content.js';
import {buildFreeSnapshotPdf} from '../api/_lib/free-snapshot-pdf.js';
const roleAnswers={careerStage:'Mid-Career Professional (4-10 years)',targetGoalRole:'Data Analyst',careerPriorities:['Get promoted','Build future-ready skills'],personalStrengths:['Solving problems','Analysing data and information'],educationLevel:"Bachelor's Degree",careerBarriers:['Missing technical or job-specific skills','Limited time for learning'],learningTime:'1-3 hours'};
const exploringAnswers={...roleAnswers,careerStage:'School Student',targetGoalRole:'Still exploring',interestFields:['Data & Analytics','Artificial Intelligence (AI)']};
function runFlow(values,detail=''){
 let answers={},extras={},skips=[],profile={};
 for(let index=0;index<9;index++){
  const next=guidedProgress(profile,answers,skips,'free');if(next.finished)break;
  const q=next.question;const a=validateQuickAnswer(q,{value:values[q.id],detail:q.id==='personalStrengths'?detail:undefined});
  answers[q.id]=a.value;extras[q.id]=a.other;if(q.id==='personalStrengths')extras.strengthEvidence=a.detail;
  profile=applyFreeAnswers(answers,extras,skips);
 }
 return {answers,extras,skips,profile,progress:guidedProgress(profile,answers,skips,'free')};
}
const guidance={targetCompetencies:Array.from({length:4},(_,i)=>({title:`Career skill ${i+1}`,bullets:[`Apply this ability through realistic examples of the career domain task ${i+1}.`,`Prepare a documented work sample to make this professional capability visible ${i+1}.`]})),nextSteps:Array.from({length:5},(_,i)=>({title:`Action ${i+1}`,bullets:[`Practise a relevant skill using a small dataset or classroom scenario number ${i+1}.`,`Record your method and the specific improvement you would try next time ${i+1}.`]}))};

test('exactly seven mandatory questions plus one conditional career interest question',()=>{
 assert.equal(FREE_QUESTIONS.length,8);
 assert.deepEqual(activeFreeQuestions({targetGoalRole:'Data Analyst'}).map(q=>q.id),['careerStage','targetGoalRole','careerPriorities','personalStrengths','educationLevel','careerBarriers','learningTime']);
 assert.deepEqual(activeFreeQuestions({targetGoalRole:'Still exploring'}).map(q=>q.id),FREE_QUESTION_IDS);
 assert.equal(isExploringGoal('not sure'),true);
 assert.equal(isExploringGoal('Data Analyst'),false);
 for(const q of FREE_QUESTIONS.filter(q=>q.kind==='multi'))assert.equal(q.maxSelections,3);
});
test('specific role: seven answers finish, interests never requested, no extra model calls',()=>{
 const f=runFlow(roleAnswers,'Built an Excel dashboard to compare monthly performance');
 assert.equal(f.progress.finished,true);assert.equal(f.progress.total,7);assert.equal(f.progress.completed,7);
 assert.equal(f.profile.freeIntakeVersion,21);assert.equal(f.profile.targetRole,'Data Analyst');
 assert.equal(f.profile.existingSkills,'Built an Excel dashboard to compare monthly performance');
 assert.equal(f.profile.interestFields.length,0);assert.equal(freeReadiness(f.profile).ready,true);
 assert.equal(freeIntakeComplete(f.answers),true);
});
test('undecided student: conditional eighth interest question, no invented role',()=>{
 const f=runFlow(exploringAnswers);
 assert.equal(f.progress.finished,true);assert.equal(f.progress.total,8);assert.equal(f.profile.experience,'No experience yet');
 assert.match(f.profile.targetRole,/Career fields in Data & Analytics and Artificial Intelligence/);
 assert.equal(f.profile.assessmentTargetRole,'');assert.equal(freeReadiness(f.profile).ready,true);
 assert.match(cacheRoleKey(f.profile.targetRole).role,/career fields/);
});
test('Other text is validated, selections limited to three, barrier contradictions rejected',()=>{
 const q=FREE_QUESTIONS.find(q=>q.id==='personalStrengths');
 assert.throws(()=>validateQuickAnswer(q,{value:[...q.options.slice(0,4)]}),/Select 1 to 3/);
 assert.throws(()=>validateQuickAnswer(q,{value:['Other']}),/short response/);
 assert.equal(validateQuickAnswer(q,{value:['Other'],other:'Quality improvement',detail:'Six Sigma practitioner'}).detail,'Six Sigma practitioner');
 assert.throws(()=>validateQuickAnswer(q,{value:['Solving problems'],detail:'asdfghqwerty'}),/meaningful/);
 const barrier=FREE_QUESTIONS.find(q=>q.id==='careerBarriers');
 assert.throws(()=>validateQuickAnswer(barrier,{value:['No major barrier right now','Limited time for learning']}),/own/);
});
test('rewind and edit: preserve example; switching to a specific role drops conditional interests',()=>{
 const f=runFlow(exploringAnswers,'Completed a classroom Excel data analysis project');
 let back=rewindFreeAnswers(f.answers,f.extras,f.profile,f.skips);
 assert.equal(back.previousId,'learningTime');
 let ans=back.answers,ext=back.extras,skips=back.skips,profile=back.profile;
 for(let i=0;i<6;i++){
  back=rewindFreeAnswers(ans,ext,profile,skips);
  ans=back.answers;ext=back.extras;skips=back.skips;profile=back.profile;
  if(back.previousId==='targetGoalRole')break;
 }
 assert.equal(back.previousId,'targetGoalRole');
 assert.equal(guidedProgress(profile,ans,skips,'free').question.id,'targetGoalRole');
 const updated=applyFreeAnswers({...ans,targetGoalRole:'Software Developer'},ext,skips);
 assert.equal(updated.targetRole,'Software Developer');assert.deepEqual(updated.interestFields,[]);
 const f2=runFlow(roleAnswers,'Used Excel in a finance report');
 const back2=rewindFreeAnswers(f2.answers,f2.extras,f2.profile,f2.skips);
 assert.equal(back2.previousId,'learningTime');
 let step=back2;
 while(step.previousId!=='personalStrengths')step=rewindFreeAnswers(step.answers,step.extras,step.profile,step.skips);
 assert.equal(step.previousDetail,'Used Excel in a finance report');
});
test('free report and PDF remain meaningful without inventing verified skills',()=>{
 const f=runFlow(roleAnswers,'Built an Excel dashboard to compare monthly performance');
 assert.ok(validRoleGuidance(guidance));
 const report=buildSnapshotV2(f.profile,guidance);
 assert.ok(isSnapshotV2(report));
 assert.match(report.profileSummary,/Data Analyst/);assert.match(report.profileSummary,/Solving problems/);
 assert.match(report.profileSummary,/Excel dashboard/);
 const pdf=buildFreeSnapshotPdf(report);assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 assert.match(pdf.toString('latin1'),/Your career profile/);
 assert.match(pdf.toString('latin1'),/Your transferable advantage/);
 assert.equal(report.careerOpportunities.length,3);
 assert.match(pdf.toString('latin1'),/Three career pathways to explore/);
});
test('Premium still needs its specific paid role; free navigation has no paid-credit use',()=>{
 const f=runFlow(exploringAnswers);
 const s={tier:'free',freeReport:{version:5},profile:f.profile};
 assert.throws(()=>checkPackEligibility(s,'starter'),/specific job role/);
 s.profile={...s.profile,assessmentTargetRole:'Data Analyst'};
 assert.equal(checkPackEligibility(s,'starter'),'paid');
});
test('UI and server have new version, dynamic progress, and no 13-question public copy',()=>{
 const server=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(server,/version:'5\.25'/);assert.match(server,/migrating=!s.freeReport/);
 assert.doesNotMatch(html,/Thirteen focused questions|Question 1 of 13/);
 assert.match(app,/requestId:uuid\(\)/); // reuses standard guided-answer API, no AI calls
});
