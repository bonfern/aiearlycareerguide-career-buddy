/* Career Buddy Version 2: deterministic, server-validated guided intake.
   Answers update the same structured career profile used by AI coaching.
   Quick selections are free in this owner-preview version (no AI call). */
import {mergeProfile,looksLikeEvidence} from './domain.js';

export const QUICK_TEXT_LIMIT=300;
export const OTHER_TEXT_LIMIT=120;
export const QUESTIONS=Object.freeze([
 {id:'employmentStatus',kind:'single',text:'What best describes your current work situation?',options:['Employed full-time','Employed part-time','Self-employed','Between jobs','Student or recent graduate']},
 {id:'currentRole',kind:'text',text:'What is your current or most recent job title?',placeholder:'e.g. Process Excellence Manager',maxLength:120,minLength:3},
 {id:'industry',kind:'single',optional:true,text:'Which industry do you mainly work in?',options:['Technology / IT','Financial services','Manufacturing / FMCG','Healthcare / Education','Other']},
 {id:'experience',kind:'single',text:'How much relevant work experience do you have?',options:['Less than 1 year','1–3 years','4–7 years','8–12 years','13+ years']},
 {id:'goal',kind:'single',text:'What would you like help with most?',options:['Get promoted','Move to another company','Change careers','Return to work','Explore career options']},
 {id:'targetRole',kind:'text',text:'Which specific job or career would you like to work towards?',placeholder:'e.g. Director of Process Excellence (or Still exploring)',maxLength:120,minLength:3},
 {id:'timeframe',kind:'single',text:'When would you like to make your next move?',options:['Within 3 months','3–6 months','6–12 months','More than a year','Flexible / unsure']},
 {id:'responsibilities',kind:'multi',text:'What do you spend most of your time doing?',options:['Managing people','Improving processes','Leading projects','Analysing data','Working with customers','Other'],maxSelections:4,minSelections:1},
 {id:'skills',kind:'multi',text:'Which skills do you use most often? Choose at least two.',options:['Leading teams','Stakeholder communication','Solving problems','Project planning','Data analysis','Process improvement','Other'],maxSelections:5,minSelections:2},
 {id:'gaps',kind:'single',text:'Where would you most like to develop?',options:['Leadership and influence','Technical / digital skills','Project delivery','Strategic thinking','Interview confidence','Not sure yet','Other']},
 {id:'constraints',kind:'single',text:'How much time can you spend learning each week?',options:['Under 2 hours','2–4 hours','5–8 hours','More than 8 hours','Flexible / not sure']},
 {id:'achievement1',kind:'text',text:'What is one project or responsibility you have worked on?',placeholder:'e.g. Building an AI chatbot for HR queries',maxLength:QUICK_TEXT_LIMIT,minLength:18,example:true},
 {id:'achievement2',kind:'text',text:'What is another project or responsibility you handled?',placeholder:'e.g. Handling HR queries for employees',maxLength:QUICK_TEXT_LIMIT,minLength:18,example:true},
]);
export const FREE_QUESTION_IDS=Object.freeze(['employmentStatus','currentRole','industry','experience','goal','targetRole','timeframe','responsibilities','skills','gaps']);
const known=Object.freeze(Object.fromEntries(QUESTIONS.map(q=>[q.id,q])));
const norm=v=>String(v??'').trim();
const nonempty=v=>typeof v==='string'&&v.trim().length>=2;
export function answeredByProfile(q,p={}){
 switch(q.id){
  case 'employmentStatus':return nonempty(p.employmentStatus);
  case 'currentRole':return typeof p.currentRole==='string'&&p.currentRole.trim().length>=3;
  case 'industry':return nonempty(p.industry);
  case 'experience':return nonempty(p.experience);
  case 'goal':return nonempty(p.goal);
  case 'targetRole':return nonempty(p.targetRole);
  case 'timeframe':return nonempty(p.timeframe);
  case 'responsibilities':return Array.isArray(p.responsibilities)&&p.responsibilities.some(nonempty);
  case 'skills':return Array.isArray(p.skills)&&p.skills.filter(nonempty).length>=2;
  case 'gaps':return Array.isArray(p.gaps)&&p.gaps.some(nonempty);
  case 'constraints':return nonempty(p.constraints);
  case 'achievement1':return Array.isArray(p.achievements)&&p.achievements.filter(looksLikeEvidence).length>=1;
  case 'achievement2':return Array.isArray(p.achievements)&&p.achievements.filter(looksLikeEvidence).length>=2;
  default:return false;
 }
}
function adaptQuestion(q,p={}){
 if(p.employmentStatus==='Student or recent graduate'){
  if(q.id==='currentRole')return {...q,text:'What are you currently studying, or what did you study?',placeholder:'e.g. BBA graduate'};
  if(q.id==='responsibilities')return {...q,text:'Which activities have you practised in projects or internships?'};
  if(q.id==='achievement1')return {...q,text:'What is one project, internship or activity you completed?',placeholder:'e.g. Led a college project that analysed customer feedback'};
  if(q.id==='achievement2')return {...q,text:'What is another project or result you can describe?',placeholder:'e.g. Coordinated volunteers to deliver a college event on time'};
 }
 if(p.employmentStatus==='Between jobs'&&q.id==='currentRole')return {...q,text:'What was your most recent job title?'};
 return q;
}
function publicQuestion(q){
 if(!q)return null;
 const {id,kind,text,options,maxSelections,minSelections,maxLength,minLength,placeholder,optional,example}=q;
 return {id,kind,text,options:options||[],maxSelections:maxSelections||1,minSelections:minSelections||1,maxLength:maxLength||OTHER_TEXT_LIMIT,minLength:minLength||1,placeholder:placeholder||'',optional:!!optional,example:!!example};
}
export function guidedProgress(p={},answers={},skips=[],phase='paid'){
 const questionSet=phase==='free'?QUESTIONS.filter(q=>FREE_QUESTION_IDS.includes(q.id)):QUESTIONS;
 const completed=questionSet.filter(q=>answeredByProfile(q,p)||Object.hasOwn(answers,q.id)||skips.includes(q.id)).length;
 const next=questionSet.find(q=>!answeredByProfile(q,p)&&!Object.hasOwn(answers,q.id)&&!skips.includes(q.id));
 return {completed,total:questionSet.length,question:publicQuestion(next?adaptQuestion(next,p):null),finished:!next,
  skipped:skips.filter(id=>!!known[id])};
}
function sanitizeText(v,min,max){
 if(typeof v!=='string')throw new Error('Please enter a short response.');
 const s=norm(v).replace(/\s+/g,' ');
 if(s.length<min)throw new Error(min>=18?`Please briefly name the work or project (at least ${min} characters).`:'Please enter a short response.');
 if(s.length>max)throw new Error(`Keep your response within ${max} characters.`);
 if(/[\u0000-\u001f]/.test(s))throw new Error('Control characters are not supported.');
 return s;
}
export function validateQuickAnswer(q,raw){
 if(!q)throw new Error('No active question. Refresh the page.');
 let value,other='';
 if(q.kind==='text'){
  const value=sanitizeText(raw?.value,q.minLength,q.maxLength);
  if(q.example&&!looksLikeEvidence(value))throw new Error('Please name a project or responsibility, such as “Building an AI chatbot for HR queries”. Ongoing work is fine.');
  return {value,other:''};
 }
 const selections=q.kind==='multi'?raw?.value:[raw?.value];
 if(!Array.isArray(selections)||!selections.length||selections.some(v=>typeof v!=='string'||!q.options.includes(v)))throw new Error('Please select an available option.');
 const unique=[...new Set(selections)];
 if(unique.length!==selections.length)throw new Error('Select each option only once.');
 if(unique.length<(q.minSelections||1)||unique.length>(q.maxSelections||1))throw new Error(`Select ${q.minSelections||1} to ${q.maxSelections||1} options.`);
 if(unique.includes('Other'))other=sanitizeText(raw?.other,2,OTHER_TEXT_LIMIT);
 return {value:q.kind==='multi'?unique:unique[0],other};
}
export function addQuickAnswer(profile,q,answer){
 const v=answer.value,other=answer.other;
 const selected=Array.isArray(v)?v:[v];
 const resolved=selected.map(x=>x==='Other'?other:x);
 let fields={};
 switch(q.id){
  case 'employmentStatus':fields.employmentStatus=v;break;
  case 'currentRole':fields.currentRole=v;break;
  case 'industry':fields.industry=resolved[0];break;
  case 'experience':fields.experience=v;break;
  case 'goal':fields.goal=v;break;
  case 'targetRole':fields.targetRole=v;break;
  case 'timeframe':fields.timeframe=v;break;
  case 'responsibilities':fields.responsibilities=resolved;break;
  case 'skills':fields.skills=resolved;break;
  case 'gaps':fields.gaps=resolved.map(x=>x==='Not sure yet'?'Not sure which development gap to prioritise':x);break;
  case 'constraints':fields.constraints=`Learning time per week: ${v}`;break;
  case 'achievement1':case 'achievement2':fields.achievements=[v];break;
  default:throw new Error('Unknown question.');
 }
 return mergeProfile(profile,fields);
}
export function displayQuickAnswer(q,answer){
 if(q.kind==='text')return answer.value;
 if(Array.isArray(answer.value))return answer.value.map(v=>v==='Other'?answer.other:v).join(' · ');
 return answer.value==='Other'?answer.other:answer.value;
}
export function validateSkip(q){
 if(!q||!q.optional)throw new Error('This information is needed for your career profile. Please answer or switch to Free Chat.');
 return q.id;
}
