import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssessmentStage,validBank,normalizeQuestionBatch,validateQuestionBatch,AssessmentPreparationError} from '../api/_lib/competency-assessment.js';

const skills=[
 {id:'s1',name:'Portfolio planning',type:'technical',benchmark:'Balances high-impact initiatives against cost, risk and realistic resource constraints.',subskills:['benefits prioritisation','scenario modelling']},
 {id:'s2',name:'Operational analysis',type:'technical',benchmark:'Identifies underlying delivery bottlenecks with structured evidence and operational metrics.',subskills:['data validation','root cause analysis']},
 {id:'s3',name:'Stakeholder influencing',type:'behavioural',benchmark:'Builds agreement amongst peers and sponsors with conflicting delivery priorities.',subskills:['stakeholder mapping','conflict resolution']},
 {id:'s4',name:'Team leadership',type:'behavioural',benchmark:'Develops cross-functional teams through feedback, accountability and structured coaching.',subskills:['delegation','coaching feedback']}
];
const other=[{name:'Financial governance',expectation:'Builds measurable financial oversight of programme outcomes.'}];
const baseText='The company is balancing competing workstreams and stakeholder demands under a tight deadline. What approach would best improve decisions based on evidence and delivery risk?';
const questionSet=(subset,{generic=false,alias=false}={})=>subset.flatMap(s=>[0,1,2].map((n)=>({
 competencyId:s.id,questionKind:s.type==='technical'&&n===0?'knowledge':'scenario',difficulty:n===1?'advanced':'applied',
 [alias?'question':'text']:generic?`${baseText} Scenario ${((Number(s.id.slice(1))-1)%2)+1}, variation ${n+1}`:`${s.name}: ${baseText} Variation ${n+1}`,
 options:alias?['Use a scored impact and risk model to compare options','Get stakeholder inputs and compare the delivery constraints','Run a small trial with explicit success metrics','Assess the process data before choosing changes']:['Use a scored impact and risk model to compare options','Get stakeholder inputs and compare the delivery constraints','Run a small trial with explicit success metrics','Assess the process data before choosing changes','Not sure'],
 ...(alias?{correctOption:'A',explanation:'Compare the relative benefits, risk and feasibility through transparent and measurable criteria.'}:{answerKey:0,rationale:'Compare the relative benefits, risk and feasibility through transparent and measurable criteria.'}),
 subskill:s.subskills[n%2]
})));
const response=result=>({result,model:'test',usage:{prompt_tokens:100,completion_tokens:150}});

test('provider cosmetic formatting is normalized but mandatory question quality remains validated',()=>{
 const raw={questions:questionSet(skills.slice(0,2),{alias:true})};
 const actual=normalizeQuestionBatch(raw,skills.slice(0,2));
 assert.equal(actual.questions.length,6);
 assert.equal(actual.questions[0].options[4],'Not sure');
 assert.equal(actual.questions[0].answerKey,0);
 assert.equal(actual.questions[0].questionKind,'knowledge');
 assert.equal(actual.questions[0].difficulty,'applied');
 assert.equal(validateQuestionBatch(actual,skills.slice(0,2)).length,6);
 raw.questions[0].options[0]='A';
 assert.throws(()=>validateQuestionBatch(normalizeQuestionBatch(raw,skills.slice(0,2)),skills.slice(0,2)),/Invalid question options/);
});

test('last-stage duplicate scenarios trigger an AI retry inside stage 3 and preserve earlier question batch',async()=>{
 let lastAttempts=0;let draft={stage:0};
 const ai=async(messages)=>{
  const input=JSON.parse(messages.find(x=>x.role==='user').content);
  if(!input.competencies)return response({competencies:skills,untestedSkills:other});
  if(input.competencies[0].id==='s1')return response({questions:questionSet(input.competencies,{generic:true})});
  lastAttempts++;
  assert.ok(input.previousQuestionTexts?.length===6,'Prior question texts given to model for avoiding repetition');
  return response({questions:questionSet(input.competencies,{generic:lastAttempts===1})});
 };
 const first=await createAssessmentStage('Director Operations',draft,ai,{maxAttempts:2});
 const second=await createAssessmentStage('Director Operations',first.draft,ai,{maxAttempts:2});
 const final=await createAssessmentStage('Director Operations',second.draft,ai,{maxAttempts:2});
 assert.equal(final.attempts.length,1);
 assert.match(final.attempts[0].reason,/overlap|whole-bank/i);
 assert.equal(lastAttempts,2);
 assert.ok(validBank(final.bank));
 assert.equal(final.bank.questions.length,12);
 assert.deepEqual(final.bank.questions.slice(0,6).map(q=>q.text),second.draft.batches[0].questions.map(q=>q.text));
});

test('stage 3 rejects duplicates on every retry without wiping stage 1 or 2',async()=>{
 const ai=async(messages)=>{
  const input=JSON.parse(messages.find(x=>x.role==='user').content);
  return response(input.competencies?{questions:questionSet(input.competencies,{generic:true})}:{competencies:skills,untestedSkills:other});
 };
 const s1=await createAssessmentStage('Director Operations',{stage:0},ai);
 const s2=await createAssessmentStage('Director Operations',s1.draft,ai);
 await assert.rejects(createAssessmentStage('Director Operations',s2.draft,ai,{maxAttempts:2}),(error)=>{
  assert.ok(error instanceof AssessmentPreparationError);
  assert.equal(error.attempts.length,2);
  return true;
 });
 assert.equal(s2.draft.stage,2);
 assert.equal(s2.draft.batches[0].questions.length,6);
});
