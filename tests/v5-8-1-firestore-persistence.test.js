import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessmentStage,validBank} from '../api/_lib/competency-assessment.js';

const skills=[
 {id:'s1',name:'Financial modelling',type:'technical',benchmark:'Develops forecast models to evaluate financial tradeoffs and business plans.',subskills:['scenario analysis','financial forecasting']},
 {id:'s2',name:'Business analytics',type:'technical',benchmark:'Turns operational data into evidence-led performance recommendations.',subskills:['data interpretation','root cause analysis']},
 {id:'s3',name:'Influencing stakeholders',type:'behavioural',benchmark:'Builds shared decisions across teams with competing business priorities.',subskills:['stakeholder engagement','resolving objections']},
 {id:'s4',name:'Leading teams',type:'behavioural',benchmark:'Coaches a team while ensuring ownership and accountable execution.',subskills:['delegating work','coaching individuals']}
];
const other=[{name:'Strategic networking',expectation:'Builds and maintains relevant professional relationships for the target role.'}];
const qFor=g=>g.flatMap(s=>[0,1,2].map(i=>({
 competencyId:s.id,questionKind:s.type==='technical'&&i===0?'knowledge':'scenario',
 difficulty:i===1?'advanced':'applied',text:`${s.name}: The team faces a difficult trade-off between risk, delivery and quality. Which response best supports a clear decision in this work situation ${i+1}?`,
 options:['Collect evidence and compare potential outcomes with the team','Ask colleagues for input before selecting a delivery approach','Run a timeboxed trial with measurable success criteria','Review current performance before adjusting the plan','Not sure'],
 answerKey:0,rationale:'Balances verifiable evidence, stakeholder needs, practical constraints and measured outcomes.',subskill:s.subskills[i%2]})));

// Firestore forbids nested arrays: [...] containing [...]. Arrays in maps
// contained in arrays are legal, so recurse into map values separately.
function firestoreSafe(value,path='root'){
 if(Array.isArray(value)){
  value.forEach((item,i)=>{
   assert.ok(!Array.isArray(item),`Nested array at ${path}[${i}]`);
   firestoreSafe(item,`${path}[${i}]`);
  });
 } else if(value&&typeof value==='object'){
  Object.entries(value).forEach(([key,entry])=>firestoreSafe(entry,`${path}.${key}`));
 }
}

test('all three stages can be serialized to Firestore and resumed after JSON round-trip',async()=>{
 const ai=async messages=>{
  const payload=JSON.parse(messages.find(m=>m.role==='user').content);
  return {result:payload.competencies?{questions:qFor(payload.competencies)}:{competencies:skills,untestedSkills:other},model:'test',usage:{}};
 };
 const a=await createAssessmentStage('Director of Finance',{stage:0},ai);
 assert.equal(a.draft.stage,1);
 firestoreSafe(a.draft);
 const b=await createAssessmentStage('Director of Finance',JSON.parse(JSON.stringify(a.draft)),ai);
 assert.equal(b.draft.stage,2);
 assert.equal(b.draft.batches.length,1);
 assert.ok(Array.isArray(b.draft.batches[0].questions));
 assert.ok(!Array.isArray(b.draft.batches[0]));
 firestoreSafe(b.draft);
 const c=await createAssessmentStage('Director of Finance',JSON.parse(JSON.stringify(b.draft)),ai);
 assert.equal(c.draft,null);
 assert.equal(c.bank.questions.length,12);
 assert.ok(validBank(c.bank));
 firestoreSafe(c.bank);
});
