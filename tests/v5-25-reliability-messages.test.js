import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createAssessmentStage,validBank,AssessmentPreparationError} from '../api/_lib/competency-assessment.js';

const skills=[
 {id:'s1',name:'Financial planning',type:'technical',benchmark:'Builds budgets and financial options to compare realistic business decisions.',subskills:['financial analysis','budget forecasting']},
 {id:'s2',name:'Data interpretation',type:'technical',benchmark:'Finds evidence in operating data and translates it into measurable action.',subskills:['data validation','trend analysis']},
 {id:'s3',name:'Team coordination',type:'behavioural',benchmark:'Works across groups to align delivery priorities and responsibilities.',subskills:['stakeholder mapping','conflict resolution']},
 {id:'s4',name:'People leadership',type:'behavioural',benchmark:'Builds accountability, constructive feedback and continuous team improvement.',subskills:['coaching peers','delegating responsibility']}
];
const untestedSkills=[{name:'Process mapping',expectation:'Creates clear visual maps of business process dependencies.'}];
const opts=['Compare evidence and tradeoffs with a practical framework','Consult affected stakeholders and clarify measurable constraints','Run a controlled trial to compare delivery outcomes','Review baseline results before selecting a change','Not sure'];
function questionsFor(group,{invalidFor='',duplicateText=''}={}){
 return group.flatMap(skill=>[0,1,2].map(i=>({
  competencyId:skill.id,questionKind:skill.type==='technical'&&i===0?'knowledge':'scenario',difficulty:i===1?'advanced':'applied',
  text:duplicateText||`${skill.name}: The delivery team has conflicting deadlines, quality measures and customer needs. Which option would you choose to improve the outcome in scenario ${i+1}?`,
  options:skill.id===invalidFor&&i===1?['Ignore all quality safeguards',...opts.slice(1)]:opts,
  answerKey:0,rationale:'Uses comparative evidence and realistic tradeoffs to choose a defensible decision with appropriate safeguards.',
  subskill:skill.subskills[i%2]
 })));
}
const response=result=>({result,model:'mock-assessment',usage:{prompt_tokens:200,completion_tokens:500}});

test('repairs only the invalid skill while retaining valid questions',async()=>{
 const stage0=await createAssessmentStage('Finance Operations Manager',{stage:0},async()=>response({competencies:skills,untestedSkills}));
 let batchCalls=[];
 const step1=await createAssessmentStage('Finance Operations Manager',stage0.draft,async messages=>{
  const data=JSON.parse(messages.find(m=>m.role==='user').content);batchCalls.push(data.competencies.map(c=>c.id));
  return response({questions:questionsFor(data.competencies,{invalidFor:batchCalls.length===1?'s2':''})});
 },{maxAttempts:2});
 assert.deepEqual(batchCalls,[['s1','s2'],['s2']]);
 assert.equal(step1.draft.stage,2);
 assert.equal(step1.draft.batches[0].questions.length,6);
 const last=await createAssessmentStage('Finance Operations Manager',step1.draft,async messages=>{
  const data=JSON.parse(messages.find(m=>m.role==='user').content);
  return response({questions:questionsFor(data.competencies)});
 },{maxAttempts:2});
 assert.equal(last.bank.questions.length,12);assert.ok(validBank(last.bank));
 assert.equal(step1.usages.length,2);
});

test('if repairs fail, partial valid questions survive a new request without regenerating them',async()=>{
 const stage0=await createAssessmentStage('Finance Operations Manager',{stage:0},async()=>response({competencies:skills,untestedSkills}));
 let partial;
 try{
  await createAssessmentStage('Finance Operations Manager',stage0.draft,async messages=>{
   const data=JSON.parse(messages.find(m=>m.role==='user').content);
   return response({questions:questionsFor(data.competencies,{invalidFor:'s2'})});
  },{maxAttempts:2});
 }catch(e){
  assert.ok(e instanceof AssessmentPreparationError);
  assert.equal(e.usages.length,2);
  assert.equal(e.draft?.stage,1);
  assert.equal(e.draft?.partialQuestions?.length,3);
  partial=e.draft;
 }
 assert.ok(partial,'Server must receive a resumable draft');
 let requested=[];
 const repaired=await createAssessmentStage('Finance Operations Manager',JSON.parse(JSON.stringify(partial)),async messages=>{
  const data=JSON.parse(messages.find(m=>m.role==='user').content);requested=data.competencies.map(c=>c.id);
  return response({questions:questionsFor(data.competencies)});
 },{maxAttempts:2});
 assert.deepEqual(requested,['s2']);
 assert.equal(repaired.draft.batches[0].questions.length,6);
});

test('bad distractors and invalid banks are still rejected rather than silently accepted',async()=>{
 const stage0=await createAssessmentStage('Finance Operations Manager',{stage:0},async()=>response({competencies:skills,untestedSkills}));
 await assert.rejects(createAssessmentStage('Finance Operations Manager',stage0.draft,async messages=>{
  const data=JSON.parse(messages.find(m=>m.role==='user').content);
  return response({questions:questionsFor(data.competencies,{invalidFor:'s1'})});
 },{maxAttempts:2}),e=>e instanceof AssessmentPreparationError&&e.draft.partialQuestions.length===3);
});

test('customer messaging uses one preparation status and reports stored partial progress safely',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const service=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(app,/assessment-stage-status/);
 assert.match(app,/Preparing step/);
 assert.match(app,/Your completed steps are saved/);
 assert.doesNotMatch(app,/Retry \/ resume preparation/);
 assert.doesNotMatch(app,/Three preparation stages protect your progress/);
 assert.match(service,/pending=e\.draft/);
 assert.match(service,/retainedQuestions/);
 assert.match(html,/app\.js\?v=5\.28/);
});
