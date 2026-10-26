import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 bankIdentity,validateSkillMap,validateQuestionBatch,shuffleAnswers,createAssessmentBank,
 validBank,assessmentProgress,submitAnswer,assessmentEvidence,publicQuestion
} from '../api/_lib/competency-assessment.js';
import {snapshotSummary,buildSnapshotV2,FREE_SNAPSHOT_VERSION} from '../api/_lib/free-snapshot-content.js';
import {asProfessionalReport} from '../api/_lib/report-v4.js';
import {buildReportPdf} from '../api/_lib/pdf-report.js';
import {QUESTIONS} from '../api/_lib/quickflow.js';
const skills=[
 {id:'s1',name:'Process analysis',type:'technical',benchmark:'Can find and quantify process improvement opportunities using real data.',subskills:['data collection','root cause analysis']},
 {id:'s2',name:'Transformation delivery',type:'technical',benchmark:'Can prioritise transformation work and deliver sustainable, measurable business improvement.',subskills:['benefits tracking','delivery planning']},
 {id:'s3',name:'Stakeholder influence',type:'behavioural',benchmark:'Can handle disagreements and gain commitment from diverse senior stakeholders.',subskills:['negotiation','executive communication']},
 {id:'s4',name:'Change leadership',type:'behavioural',benchmark:'Can win adoption of new ways of working across multiple teams and locations.',subskills:['adoption planning','resistance management']}
];
const untestedSkills=[{name:'Budgeting and ROI',expectation:'Can evaluate financial benefits and prioritise investment decisions.'}];
const map={competencies:skills,untestedSkills};
function rawQs(group){return group.flatMap(s=>Array.from({length:3},(_,i)=>({
 competencyId:s.id,questionKind:s.type==='technical'&&i===0?'knowledge':'scenario',difficulty:i===1?'advanced':'applied',
 text:`${s.name}: A team needs to handle issue ${i+1} while managing quality, risk, time and stakeholder expectations. What should the leader do first?`,
 options:['Evaluate impact using evidence and agree priorities','Check capacity before committing to a quick change','Test options with a smaller team first','Ask the relevant teams to share their views','Not sure'],
 answerKey:0,rationale:'The strongest answer balances evidence, business risk and the practical decision needed.',subskill:s.subskills[i%2]
})));}

test('four essential role competencies cover 2 technical and 2 behavioural',()=>{
 assert.equal(validateSkillMap(map).competencies.length,4);
 assert.throws(()=>validateSkillMap({...map,competencies:skills.slice(0,3)}),/4–5/);
 assert.throws(()=>validateSkillMap({...map,competencies:skills.map(s=>({...s,type:'technical'}))}),/behavioural/);
});
test('12 clear questions have meaningful role-specific choices and no giveaway answers',()=>{
 const q=validateQuestionBatch({questions:rawQs(skills)},skills);assert.equal(q.length,12);
 assert.equal(q.filter(x=>x.questionKind==='knowledge').length,2);
 assert.throws(()=>validateQuestionBatch({questions:rawQs(skills).map((q,i)=>i===1?{...q,options:['Do nothing',...q.options.slice(1)]}:q)},skills),/Invalid question/);
});
test('bank generator uses an anonymised role label, never an email or personal profile',async()=>{
 const called=[];let n=0;
 const fake=async(messages)=>{called.push(messages);const data=n===0?map:{questions:rawQs(n===1?skills.slice(0,2):skills.slice(2))};n++;return {result:data,usage:{prompt_tokens:123,completion_tokens:321},model:'test'};};
 const {bank,usages}=await createAssessmentBank('Director of Process Excellence',fake);
 assert.equal(called.length,3);assert.equal(usages.length,3);assert.equal(bank.questions.length,12);assert.ok(validBank(bank));
 assert.doesNotMatch(JSON.stringify(called),/tester@example\.com|resume text|HR chatbot achievement/);
 assert.equal(bankIdentity(' DIRECTOR  of Process Excellence ').key,bankIdentity('director of process excellence').key);
});
test('answer keys stay server side, cannot be supplied by client; never unlock before 12 questions',()=>{
 const bank={version:2,role:'Director of Process Excellence',...map,questions:shuffleAnswers(validateQuestionBatch({questions:rawQs(skills)},skills),()=>0)};
 assert.ok(validBank(bank));let answers=[];
 for(let i=0;i<12;i++){
  const prog=assessmentProgress(bank,answers);assert.equal(prog.finished,false);
  const q=prog.question;assert.equal(q.number,i+1);assert.ok(!('answerKey' in q));assert.ok(!('rationale' in q));
  assert.throws(()=>submitAnswer(bank,answers,q.id,9),/Choose one/);
  assert.throws(()=>submitAnswer(bank,answers,'arbitrary-id',0),/moved forward/);
  answers=submitAnswer(bank,answers,q.id,i%3===0?4:bank.questions[i].answerKey);
 }
 assert.equal(assessmentProgress(bank,answers).finished,true);
 assert.equal(assessmentProgress(bank,answers).question,null);
 assert.throws(()=>submitAnswer(bank,answers,'s1-q1',0),/moved forward/);
 const ev=assessmentEvidence(bank,answers);assert.equal(ev.skills.length,4);assert.equal(ev.questionCount,12);
 assert.ok(ev.skills.every(x=>x.answered===3));assert.ok(ev.skills.every(x=>x.correct===2));
 assert.ok(ev.skills.every(x=>x.category==='Develop further'));
});
test('scoring categories represent MCQ judgment, not claims of workplace validation',()=>{
 const bank={version:2,role:'Process Director',...map,questions:validateQuestionBatch({questions:rawQs(skills)},skills)};
 const chosen=bank.questions.map((q,i)=>({questionId:q.id,competencyId:q.competencyId,selectedText:q.options[i%3===0?0:4],correct:i%3===0,subskill:q.subskill}));
 const ev=assessmentEvidence(bank,chosen);assert.ok(ev.skills.every(s=>s.correct===1&&s.category==='Priority development area'));
 const report={summary:'Test summary sufficient length for complete professional development report format.',goalPath:{headline:'Director',careerActions:Array.from({length:4},(_,i)=>({title:`Action ${i}`,action:'Complete a role-specific practical project',outcome:'Evidence of improvement'}))},skillAssessments:skills.map(x=>({...x,targetBenchmark:x.benchmark,currentCompetency:'self report',gap:'needs testing',actions:['Action a','Action b'],practiceTask:'Write a practical plan',successIndicator:'Reviewed at work',priority:'Validate first'})),additionalSkills:untestedSkills.map(x=>({...x,nextStep:'Research',howToVerify:'Discuss'})),actionPlan:['Days 1–30','Days 31–60','Days 61–90'].map(period=>({period,focus:'Role readiness',actions:['Build a case example','Practise interview decisions']})),interviewPreparation:Array.from({length:10},(_,i)=>({question:`What would you do in scenario ${i}?`,competency:'Role judgment',whatEvaluated:'Applied problem solving',answerFramework:'Describe actions and measurable evidence'})),learningGuidance:{free:[],paid:[],certifications:[]},resumeReview:{status:'not_provided',changes:[],missingEvidence:[]}};
 // asProfessionalReport preserves the existing report sections while attaching server scores.
 const out=asProfessionalReport(report,{targetRole:'Director of Process Excellence'},ev);
 assert.equal(out.coverage.answered,12);assert.equal(out.coverage.assessed,4);
 assert.ok(out.skillAssessments.every(s=>s.correct===1&&s.tested===3));
 assert.ok(out.skillAssessments.every(s=>/decision-making, not verified job performance/.test(s.currentCompetency)));
 assert.ok(out.skillAssessments.every(s=>s.priority==='Build this first'));
 const pdf=buildReportPdf(out);assert.equal(pdf.toString('latin1',0,8),'%PDF-1.4');fs.writeFileSync('/mnt/data/Career_Buddy_V5_6_Graded_Report_Sample.pdf',pdf);
});
test('free snapshot uses an interpretation rather than a copy of answers',()=>{
 const prose=snapshotSummary({currentRole:'Quality Lead',targetRole:'Director of Process Excellence',goal:'Get promoted',roleExperience:['Lean Six Sigma','Automation'],gaps:['Strategic thinking']});
 assert.match(prose,/important question/);assert.match(prose,/not a confirmed competency/);assert.match(prose,/strategic thinking/i);
 assert.equal(FREE_SNAPSHOT_VERSION,4);
 assert.ok(prose.length<=540);
});
test('free multiselect question explicitly states the maximum of four',()=>{
 const q=QUESTIONS.find(q=>q.id==='roleExperience');assert.match(q.text,/Select up to 4/);assert.equal(q.maxSelections,4);
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/selectedCount/);assert.match(app,/input.checked=false/);
});
test('full paid report requires answered and complete competency assessment, not just self-reported examples',()=>{
 const service=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 assert.match(service,/if\(!s\.assessmentBank\|\|!assessmentProgress\(s\.assessmentBank,s\.assessmentAnswers/);
 assert.match(service,/reportReady:paid&&assessment.finished/);
 assert.match(service,/async function answerAssessment/);
 assert.match(service,/competency-bank-generation/);
 assert.match(service,/buddyCompetencyBanksV2/);
 assert.match(service,/question bank is not ready|start the detailed assessment/i);
});
