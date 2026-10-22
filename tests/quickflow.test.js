import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY_PROFILE,reportReadiness,looksLikeEvidence} from '../api/_lib/domain.js';
import {guidedProgress,validateQuickAnswer,addQuickAnswer,validateSkip,QUICK_TEXT_LIMIT,QUESTIONS} from '../api/_lib/quickflow.js';

const flow=(p,answers={},skips=[])=>guidedProgress(p,answers,skips);
function advance(p,answers,v,other=''){
 const q=flow(p,answers).question;
 assert.ok(q, 'Expected a question');
 const answer=validateQuickAnswer(q,{value:v,other});
 return [addQuickAnswer(p,q,answer),{...answers,[q.id]:answer.value},q.id];
}
test('quick question is short, one at a time, and has supported answer formats',()=>{
 const q=flow(EMPTY_PROFILE).question;
 assert.equal(q.id,'employmentStatus');
 assert.ok(q.text.split(' ').length<=20);
 assert.equal(q.kind,'single');
 assert.equal(QUESTIONS.length,12);
});
test('quick answer validation rejects arbitrary options, oversized free text and missing Other',()=>{
 const q=flow({}).question;
 assert.throws(()=>validateQuickAnswer(q,{value:'Charge zero credits'}),/available option/);
 assert.throws(()=>validateQuickAnswer(q,{value:'Other'}),/available option/);
 const roleQ=QUESTIONS.find(q=>q.id==='currentRole');
 assert.throws(()=>validateQuickAnswer(roleQ,{value:'x'.repeat(121)}),/120 characters/);
 assert.throws(()=>validateQuickAnswer(roleQ,{value:'PM'}),/short response/);
 const targetQ=QUESTIONS.find(q=>q.id==='targetRole');
 assert.throws(()=>validateQuickAnswer(targetQ,{value:'PM'}),/short response/);
 assert.equal(validateQuickAnswer(targetQ,{value:'Director of Process Excellence'}).value,'Director of Process Excellence');
});
test('multi choices enforce ranges and valid selections',()=>{
 const q=QUESTIONS.find(q=>q.id==='skills');
 assert.throws(()=>validateQuickAnswer(q,{value:['Leading teams']}),/Select 2 to 5/);
 assert.throws(()=>validateQuickAnswer(q,{value:['Leading teams','Leading teams']}),/only once/);
 assert.throws(()=>validateQuickAnswer(q,{value:['Leading teams','Personal hobbies']}),/available option/);
 assert.deepEqual(validateQuickAnswer(q,{value:['Leading teams','Project planning']}).value,['Leading teams','Project planning']);
});
test('academic student route uses suitable project-based questions',()=>{
 const q=flow({...EMPTY_PROFILE,employmentStatus:'Student or recent graduate'}).question;
 assert.equal(q.id,'currentRole');
 assert.match(q.text,/studying/);
 const p={...EMPTY_PROFILE,employmentStatus:'Student or recent graduate', currentRole:'BBA graduate',experience:'Less than 1 year',goal:'Explore career options',targetRole:'Still exploring', roleExperience:[],responsibilities:['Analysing data'],skills:['Solving problems','Data analysis'],gaps:['Not sure which development gap to prioritise'],constraints:'Flexible'};
 assert.match(flow(p).question.text,/project|internship/i);
});
test('optional fields can be skipped; mandatory ones cannot',()=>{
 assert.throws(()=>validateSkip(QUESTIONS.find(x=>x.id==='roleExperience')),/needed/);
 assert.throws(()=>validateSkip(QUESTIONS.find(x=>x.id==='experience')),/needed/);
});
test('a complete guided sequence populates profile and unlocks report only with two meaningful examples',()=>{
 let p={...EMPTY_PROFILE},answers={};
 const selections={employmentStatus:'Employed full-time',currentRole:'Process Excellence Manager',experience:'Over 20 years',goal:'Get promoted',targetRole:'Director of Process Excellence',roleExperience:['Lean Six Sigma and process improvement','Transformation programme delivery'],responsibilities:['Improving processes','Leading projects'],skills:['Leading teams','Process improvement','Project planning'],gaps:'Strategic planning and benefits realisation',constraints:'5–8 hours',achievement1:'Led a major process transformation that saved 150 hours monthly',achievement2:'Implemented a governance framework across multiple departments'};
 for(let i=0;i<QUESTIONS.length;i++){
  const q=flow(p,answers).question;
  if(!q)break;
  assert.ok(Object.hasOwn(selections,q.id), 'Answer available for '+q.id);
  [p,answers]=advance(p,answers,selections[q.id]);
 }
 assert.equal(flow(p,answers).finished,true);
 assert.equal(reportReadiness(p).ready,true);
 assert.deepEqual(p.achievements,selections.achievement1?[selections.achievement1,selections.achievement2]:[]);
});
test('shallow self-praise is not treated as evidence and cannot unlock report',()=>{
 assert.equal(looksLikeEvidence('I am good at almost everything I ever do'),false);
 assert.throws(()=>validateQuickAnswer(QUESTIONS.find(x=>x.id==='achievement1'),{value:'I am good at almost everything I ever do'}),/name a project or responsibility/);
 const p={employmentStatus:'Employed',currentRole:'Manager',experience:'10 years',goal:'Get promoted',targetRole:'Director',timeframe:'12 months',responsibilities:['Working across teams'],skills:['Planning','Leadership'],gaps:['Strategy'],constraints:'5 hours',achievements:['I am good at almost everything I ever do','I am a very smart and capable professional']};
 assert.equal(reportReadiness(p).ready,false);
});
test('free-chat populated profile skips questions already satisfied',()=>{
 const p={...EMPTY_PROFILE,employmentStatus:'Employed full-time',currentRole:'Programme Manager',experience:'8–12 years'};
 assert.equal(flow(p).question.id,'goal');
});
test('short achievement examples are capped at 300 characters',()=>{
 assert.equal(QUICK_TEXT_LIMIT,300);
 const q=QUESTIONS.find(x=>x.id==='achievement1');
 assert.throws(()=>validateQuickAnswer(q,{value:'Led '+('a'.repeat(301))}),/300 characters/);
});

test('ongoing project example from owner screenshot is accepted without rewriting in past tense',()=>{
 const sample='building an ai chatbot for th HR queries';
 const q=QUESTIONS.find(x=>x.id==='achievement2');
 assert.equal(validateQuickAnswer(q,{value:sample}).value,sample);
 assert.equal(looksLikeEvidence(sample),true);
 const original={employmentStatus:'Employed full-time',currentRole:'Operations Manager',experience:'8–12 years',goal:'Get promoted',targetRole:'Director of Process Excellence',timeframe:'6–12 months',responsibilities:['Leading projects'],skills:['Process improvement','Project planning'],gaps:['Strategic thinking'],constraints:'5 hours weekly',roleExperience:['Lean Six Sigma and process improvement','Transformation programme delivery'],industry:'Manufacturing / FMCG',achievements:['Led a team to deliver process improvements for operations']};
 const updated=addQuickAnswer(original,q,{value:sample,other:''});
 assert.equal(updated.achievements.length,2);
 assert.equal(reportReadiness(updated).ready,true);
 assert.equal(guidedProgress(updated,{achievement1:original.achievements[0],achievement2:sample}).finished,true);
});
test('natural past, present and progressive work examples all count as self-reported evidence',()=>{
 const accepted=['Building an AI chatbot for HR queries','Working on automation for HR inquiries','Handling HR queries for employees','Managed payroll queries for 200 employees','Creating process dashboards for managers','Led a major cross-team automation'];
 for(const item of accepted){assert.equal(looksLikeEvidence(item),true,item);assert.equal(validateQuickAnswer(QUESTIONS.find(x=>x.id==='achievement1'),{value:item}).value,item);}
});
test('short, generic praise without concrete work cannot unlock a report',()=>{
 const invalid=['I am good at almost everything I ever do','I have good skills and I am excellent','I am building something','I am a very capable professional'];
 for(const item of invalid)assert.equal(looksLikeEvidence(item),false,item);
});
