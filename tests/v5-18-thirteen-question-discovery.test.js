import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {FREE_QUESTION_IDS,FREE_QUESTIONS,freeIntakeComplete,applyFreeAnswers} from '../api/_lib/quickflow.js';
import {guidedProgress,validateQuickAnswer,rewindFreeAnswers,validateSkip} from '../api/_lib/quickflow.js';
import {freeReadiness,checkPackEligibility,EMPTY_PROFILE} from '../api/_lib/domain.js';
import {buildSnapshotV2,validRoleGuidance,isSnapshotV2} from '../api/_lib/free-snapshot-content.js';

const base={careerStage:'College / University Student',careerSituation:['I want to switch to a different role',"I'm unsure about my next career move"],interestFields:['Data & Analytics','Artificial Intelligence (AI)'],personalStrengths:['Solving problems','Analyzing data and information'],enjoyedWork:['Working with data and numbers','Learning and researching new topics'],workEnvironment:['Team-oriented and collaborative'],educationLevel:"Bachelor's Degree",existingSkills:'Excel, Power BI',careerAmbition:'Build future-ready skills',learningTime:'4-6 hours',changeComfort:'Moderately comfortable',careerValues:['Continuous learning and growth','Healthy work-life balance'],additionalContext:'I enjoy classroom projects involving survey analysis.'};
function flow(values=base, skipped=[]){let profile={...EMPTY_PROFILE},answers={},extras={},skips=[];
 for(const id of FREE_QUESTION_IDS){const q=guidedProgress(profile,answers,skips,'free').question;assert.equal(q?.id,id);
  if(skipped.includes(id)){assert.equal(q.optional,true);validateSkip(q);skips.push(id);}
  else{const raw=values[id],other=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw.other:'';const value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw.value:raw;
   const a=validateQuickAnswer(q,{value,other});answers[id]=a.value;extras[id]=a.other;}
  profile=applyFreeAnswers(answers,extras,skips);
 }
 return {profile,answers,extras,skips};}

test('V5.18 asks the exact 13 requested questions in order',()=>{
 assert.equal(FREE_QUESTIONS.length,13);
 assert.deepEqual(FREE_QUESTION_IDS,['careerStage','careerSituation','interestFields','personalStrengths','enjoyedWork','workEnvironment','educationLevel','existingSkills','careerAmbition','learningTime','changeComfort','careerValues','additionalContext']);
 assert.equal(FREE_QUESTIONS[0].options[0],'School Student');
 assert.equal(FREE_QUESTIONS[0].options.at(-1),'Other');
 assert.equal(FREE_QUESTIONS[1].kind,'multi');
 assert.equal(FREE_QUESTIONS[7].kind,'text');
 assert.equal(FREE_QUESTIONS[12].optional,true);
});

test('every free selection question validates and stores the Other description',()=>{
 for(const q of FREE_QUESTIONS.filter(q=>q.options?.includes('Other'))){
  const value=q.kind==='multi'?['Other']:'Other';
  assert.throws(()=>validateQuickAnswer(q,{value,other:''}),/short response/i,q.id);
  const result=validateQuickAnswer(q,{value,other:'Sustainable energy sector'});
  assert.equal(result.other,'Sustainable energy sector');
 }
});

test('multi-select limits are enforced per question',()=>{
 for(const [id,limit] of [['interestFields',5],['personalStrengths',5],['enjoyedWork',3],['workEnvironment',3],['careerValues',3]]){
  const q=FREE_QUESTIONS.find(x=>x.id===id);assert.equal(q.maxSelections,limit);
  const valid=validateQuickAnswer(q,{value:q.options.slice(0,limit)});assert.equal(valid.value.length,limit);
  assert.throws(()=>validateQuickAnswer(q,{value:q.options.slice(0,limit+1)}),/Select/);
 }
});

test('completed 13-question student flow produces a valid free profile with no invented job experience',()=>{
 const f=flow();assert.equal(guidedProgress(f.profile,f.answers,f.skips,'free').finished,true);
 assert.equal(freeIntakeComplete(f.answers,f.skips),true);assert.equal(freeReadiness(f.profile).ready,true);
 assert.equal(f.profile.experience,'No experience yet');assert.equal(f.profile.educationLevel,"Bachelor's Degree");
 assert.deepEqual(f.profile.personalStrengths,base.personalStrengths);
 assert.equal(f.profile.goal,'Build future-ready skills');assert.match(f.profile.targetRole,/Career paths in Data & Analytics/);
 assert.ok(!f.profile.assessmentTargetRole);
});

test('the optional final question can be skipped with N/A without breaking completion',()=>{
 const f=flow(base,['additionalContext']);assert.equal(f.profile.additionalContext,'');
 assert.equal(freeReadiness(f.profile).ready,true);
 assert.equal(guidedProgress(f.profile,f.answers,f.skips,'free').finished,true);
 const back=rewindFreeAnswers(f.answers,f.extras,f.profile,f.skips);
 assert.equal(back.previousId,'additionalContext');assert.equal(back.previousValue,'');
 assert.equal(guidedProgress(back.profile,back.answers,back.skips,'free').question.id,'additionalContext');
});

test('Q8 can be skipped by beginners without blocking report or requiring an invented skill',()=>{
 const f=flow(base,['existingSkills','additionalContext']);
 assert.equal(f.profile.existingSkills,'');assert.deepEqual(f.profile.roleExperience,[]);
 assert.equal(freeReadiness(f.profile).ready,true);assert.ok(freeIntakeComplete(f.answers,f.skips));
});

test('existing skills and optional context reject obvious nonsense without AI calls',()=>{
 for(const id of ['existingSkills','additionalContext']){
  const q=FREE_QUESTIONS.find(q=>q.id===id);assert.throws(()=>validateQuickAnswer(q,{value:'asdfghqwertyabcdefghijkl'}),/meaningful/);
 }
});

test('other text is restored while rewinding and previous answers remain editable',()=>{
 const f=flow({...base,careerStage:{value:'Other',other:'Intern returning to studies'}});
 const all=rewindFreeAnswers(f.answers,f.extras,f.profile);
 assert.equal(all.previousId,'additionalContext');
 let answers=all.answers,extras=all.extras,profile=all.profile,skips=all.skips;
 while(answers.careerStage&&Object.keys(answers).length>1){const b=rewindFreeAnswers(answers,extras,profile,skips);answers=b.answers;extras=b.extras;profile=b.profile;skips=b.skips;}
 assert.equal(answers.careerStage,'Other');assert.equal(extras.careerStage,'Intern returning to studies');
 const first=rewindFreeAnswers(answers,extras,profile,skips);assert.equal(first.previousId,'careerStage');
});

test('free career readiness requires all meaningful structured categories but not optional Q8/Q13',()=>{
 const f=flow(base,['existingSkills','additionalContext']);assert.ok(freeReadiness(f.profile).ready);
 assert.equal(freeReadiness({...f.profile,personalStrengths:[]}).ready,false);
 assert.equal(freeReadiness({...f.profile,careerValues:[]}).ready,false);
});

test('premium requires a specific assessment role for new free-intake users',()=>{
 const f=flow();let session={tier:'free',freeReport:{version:5},profile:f.profile};
 assert.throws(()=>checkPackEligibility(session,'starter'),/specific job role/);
 session.profile={...session.profile,targetRole:'Data Analyst',assessmentTargetRole:'Data Analyst'};
 assert.equal(checkPackEligibility(session,'starter'),'paid');
});

test('frontend and server disable free browser restriction by default and request paid role before checkout',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const server=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(server,/ENFORCE_FREE_BROWSER_LIMIT==='1'/);
 assert.match(server,/if\(!enforceBrowserLimit\(\)\)return null/);
 assert.match(server,/async function setAssessmentRole/);
 assert.match(app,/api\('setAssessmentRole',\{role\}\)/);
 assert.match(html,/id="assessmentRole"/);
 assert.doesNotMatch(html,/One free discovery per browser/);
 assert.match(html,/Thirteen focused questions/);
});

test('free report keeps self-reported strengths and tools distinct from verified competence',()=>{
 const g={targetCompetencies:Array.from({length:4},(_,i)=>({title:`Foundational skill ${i+1}`,bullets:[`Use this skill during realistic activities in the chosen career interest area number ${i+1}.`,`Produce a practical example showing skill level through supervised practice number ${i+1}.`]})),nextSteps:Array.from({length:5},(_,i)=>({title:`Try activity ${i+1}`,bullets:[`Complete one relevant practical learning activity in your chosen field this week number ${i+1}.`,`Write a short summary of your learning and what you would improve next time ${i+1}.`]}))};
 const f=flow();assert.ok(validRoleGuidance(g));const r=buildSnapshotV2(f.profile,g);
 assert.ok(isSnapshotV2(r));assert.match(r.profileSummary,/Data & Analytics/);
 assert.match(r.profileSummary,/Solving problems/);assert.match(r.profileSummary,/Excel/);
 assert.equal(r.reportedStrengths[0],'Solving problems');assert.match(r.careerGoal,/Career paths in/);
});


test('Q8 accommodates short genuine tool names without a report quality rejection',()=>{
 const f=flow({...base,existingSkills:'Go, RStudio'});
 assert.ok(freeReadiness(f.profile).ready);
 const g={targetCompetencies:Array.from({length:4},(_,i)=>({title:`Career skill ${i+1}`,bullets:[`Apply this ability through realistic examples of the career domain task ${i+1}.`,`Prepare a documented work sample to make this professional capability visible ${i+1}.`]})),nextSteps:Array.from({length:5},(_,i)=>({title:`Action ${i+1}`,bullets:[`Practise a relevant skill using a small dataset or classroom scenario number ${i+1}.`,`Record your method and the specific improvement you would try next time ${i+1}.`]}))};
 assert.ok(validRoleGuidance(g));
 assert.ok(isSnapshotV2(buildSnapshotV2(f.profile,g)));
});

test('final optional question accepts literal N/A and skips cleanly',()=>{
 const q=FREE_QUESTIONS.at(-1);const a=validateQuickAnswer(q,{value:'N/A'});assert.equal(a.value,'N/A');
 assert.equal(validateSkip(q),q.id);
});
