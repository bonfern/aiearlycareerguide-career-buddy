import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeSkillMap,validateSkillMap,createAssessmentStage,validBank,AssessmentPreparationError} from '../api/_lib/competency-assessment.js';

const skills=[
 {id:'s1',name:'Financial modelling',type:'technical',benchmark:'Develops forecast models to evaluate financial tradeoffs and business plans.',subskills:['scenario analysis','financial forecasting']},
 {id:'s2',name:'Business analytics',type:'technical',benchmark:'Turns operational data into evidence-led performance recommendations.',subskills:['data interpretation','root cause analysis']},
 {id:'s3',name:'Influencing stakeholders',type:'behavioural',benchmark:'Builds shared decisions across teams with competing business priorities.',subskills:['stakeholder engagement','resolving objections']},
 {id:'s4',name:'Leading teams',type:'behavioural',benchmark:'Coaches a team while ensuring ownership and accountable execution.',subskills:['delegating work','coaching individuals']}
];
const other=[{name:'Strategic networking',expectation:'Builds and maintains relevant professional relationships for the target role.'}];
const qFor=g=>g.flatMap(s=>[0,1,2].map(i=>({competencyId:s.id,questionKind:s.type==='technical'&&i===0?'knowledge':'scenario',difficulty:i===1?'advanced':'applied',text:`${s.name}: The team faces a difficult trade-off between risk, delivery and quality. Which response best supports a clear decision in this work situation ${i+1}?`,options:['Collect evidence and compare potential outcomes with the team','Ask colleagues for input before selecting a delivery approach','Run a timeboxed trial with measurable success criteria','Review current performance before adjusting the plan','Not sure'],answerKey:0,rationale:'Balances verifiable evidence, stakeholder needs, practical constraints and measured outcomes.',subskill:s.subskills[i%2]})));

test('validator identifies exact deficient field at role competency 3',()=>{
 const x={competencies:skills.map(s=>({...s})),untestedSkills:other};x.competencies[2].benchmark='short';
 assert.throws(()=>validateSkillMap(x),/Invalid role competency 3: benchmark description/);
});
test('skill-map normalises allowed AI field aliases and object subskills without inventing gaps',()=>{
 const x={competencies:skills.map(s=>({...s})),untestedSkills:other};
 x.competencies[2]={...x.competencies[2],type:'interpersonal',expectation:x.competencies[2].benchmark,benchmark:undefined,subskills:[{name:'stakeholder engagement'},{skill:'resolving objections'}]};
 const cleaned=validateSkillMap(normalizeSkillMap(x));
 assert.equal(cleaned.competencies[2].type,'behavioural');
 assert.equal(cleaned.competencies[2].benchmark,skills[2].benchmark);
 assert.deepEqual(cleaned.competencies[2].subskills,skills[2].subskills);
});
test('resumable bank preparation survives failure in second batch and avoids repeating first stages',async()=>{
 let calls=0;
 const ai=async(messages)=>{
  calls++;
  const user=JSON.parse(messages.find(m=>m.role==='user').content);
  if(!user.competencies)return {result:{competencies:skills,untestedSkills:other},model:'test',usage:{prompt_tokens:90,completion_tokens:200}};
  if(user.competencies[0].id==='s3'&&calls<5)return {result:{questions:[]},model:'test',usage:{prompt_tokens:90,completion_tokens:200}};
  return {result:{questions:qFor(user.competencies)},model:'test',usage:{prompt_tokens:90,completion_tokens:200}};
 };
 const first=await createAssessmentStage('Director of Finance',{stage:0},ai,{maxAttempts:2});
 assert.equal(first.draft.stage,1);
 const second=await createAssessmentStage('Director of Finance',first.draft,ai,{maxAttempts:2});
 assert.equal(second.draft.stage,2);
 await assert.rejects(createAssessmentStage('Director of Finance',second.draft,ai,{maxAttempts:2}),e=>{
  assert.ok(e instanceof AssessmentPreparationError);
  assert.equal(e.usages.length,2);
  return true;
 });
 const completed=await createAssessmentStage('Director of Finance',second.draft,ai,{maxAttempts:2});
 assert.ok(validBank(completed.bank));
 assert.equal(completed.bank.questions.length,12);
 assert.equal(calls,5);
 assert.deepEqual(completed.bank.questions.map(q=>q.competencyId).sort(),['s1','s1','s1','s2','s2','s2','s3','s3','s3','s4','s4','s4']);
});
test('stages only expose ready assessment once final batch passes',async()=>{
 const ai=async(m)=>{const user=JSON.parse(m.find(x=>x.role==='user').content);return {result:user.competencies?{questions:qFor(user.competencies)}:{competencies:skills,untestedSkills:other},model:'test',usage:{}}};
 let draft={stage:0};
 for(let n=0;n<3;n++){
  const r=await createAssessmentStage('Director of Finance',draft,ai);
  if(n<2){assert.equal(r.bank,undefined);draft=r.draft;}else{assert.ok(r.bank);assert.equal(r.draft,null);}
 }
});
test('frontend makes three bounded requests and keeps user-visible retry information',()=>{
 const js=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(js,/for\(let step=0;step<3;step\+\+\)/);
 assert.match(js,/preparationError=e\.message/);
 assert.match(js,/Try again/);
});
test('backend saves intermediate drafts and records rejected AI provider usage',()=>{
 const src=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 assert.match(src,/assessmentDraft:\{\.\.\.stageResult\.draft,roleKey:/);
 assert.match(src,/competency-bank-rejected/);
 assert.match(src,/maxAttempts:2/);
 assert.match(src,/busy:\{id:key,until:now\(\)\+180000\}/);
});
