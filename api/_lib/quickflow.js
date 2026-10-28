/* Career Buddy V5.4: deterministic, server-validated, role-aware guided intake.
   Answers update the same structured career profile used by AI coaching.
   Quick selections are free in this owner-preview version (no AI call). */
import {mergeProfile,looksLikeEvidence} from './domain.js';

// Curated role-specific competencies keep free screening deterministic and inexpensive.
// The 'Other' response is available for roles beyond these broad categories.
const ROLE_COMPETENCIES=Object.freeze([
 {pattern:/process excellence|continuous improvement|lean six sigma|business excellence|operational excellence|quality improvement/i,items:['Lean Six Sigma and process improvement','Transformation programme delivery','Data analytics and performance management','Automation and AI adoption','Strategic planning and benefits realisation','Leading change and influencing stakeholders']},
 {pattern:/product manager|product owner|product management/i,items:['Product strategy and roadmaps','Customer discovery and user research','Product analytics and KPIs','Prioritising features and trade-offs','Cross-functional stakeholder alignment','Product delivery and experimentation']},
 {pattern:/project manager|program(?:me)? manager|pmo|project management/i,items:['Project scope and planning','Managing risks and dependencies','Budget and resource management','Stakeholder communication','Cross-functional delivery','Project governance and reporting']},
 {pattern:/data scientist|data analyst|business intelligence|analytics engineer|data engineer|machine learning|ai engineer/i,items:['Data analysis and interpretation','SQL and data preparation','Dashboards and data storytelling','Statistics and experimentation','Automation or predictive modelling','Explaining insights to stakeholders']},
 {pattern:/software|developer|programmer|engineering manager|devops|cloud architect|cybersecurity|it architect|technical lead/i,items:['Software or systems design','Coding and technical delivery','Testing and reliability','Security and risk management','Technical problem-solving','Collaborating across engineering teams']},
 {pattern:/human resources|\bhr\b|talent acquisition|people operations|learning and development|recruit(?:er|ment)/i,items:['Talent or workforce planning','Employee relations and policy','HR data and systems','Learning and capability development','Change communication and influencing','Stakeholder partnership']},
 {pattern:/finance|accountant|financial|audit|tax|treasury|investment|controller/i,items:['Financial analysis and reporting','Budgeting and forecasting','Risk and internal controls','Financial modelling and business cases','Regulatory or policy compliance','Presenting recommendations to leaders']},
 {pattern:/sales|business development|account manager|customer success/i,items:['Customer needs discovery','Sales or account strategy','Negotiation and influencing','Pipeline and revenue analysis','Customer relationship management','Cross-functional account delivery']},
 {pattern:/marketing|brand manager|digital market|growth manager|social media|content strateg/i,items:['Campaign strategy and execution','Customer and market research','Content and communication','Digital-channel analytics','Brand positioning and storytelling','Cross-functional campaign delivery']},
 {pattern:/operations|supply chain|logistics|procurement|manufactur|production|plant manager|warehouse/i,items:['Operational planning and delivery','Process improvement and quality','Capacity and resource management','Supply chain or supplier coordination','Performance metrics and analytics','Team leadership and change']},
 {pattern:/teacher|professor|educator|instructional|academic|trainer/i,items:['Curriculum or learning design','Teaching and facilitation','Assessing learning outcomes','Communication and learner support','Educational technology','Mentoring and stakeholder collaboration']},
 {pattern:/nurs|doctor|physician|healthcare|clinical|pharmacist|physiotherap/i,items:['Domain-specific clinical knowledge','Safety and quality standards','Patient or client communication','Documentation and decision-making','Cross-disciplinary teamwork','Evidence-based practice']},
 {pattern:/designer|ux|ui designer|graphic design|creative director|visual design/i,items:['User or audience research','Design tools and execution','Visual communication','Prototyping and iteration','Creative problem-solving','Stakeholder feedback and collaboration']},
 {pattern:/lawyer|legal|counsel|compliance officer/i,items:['Legal research and analysis','Drafting and documentation','Risk and compliance assessment','Negotiation and communication','Stakeholder advisory','Ethical judgement']},
 {pattern:/hotel|hospitality|chef|restaurant|tourism|travel manager/i,items:['Customer experience and service','Operations and safety','Resource and shift planning','Team leadership','Quality and service standards','Handling complaints and feedback']},
 {pattern:/director|vice president|\bvp\b|chief|head of|general manager|leadership/i,items:['Business strategy and planning','Financial and commercial judgement','Leading teams and talent development','Change and transformation leadership','Executive stakeholder influence','Performance and risk governance']},
]);
const GENERAL_COMPETENCIES=Object.freeze(['Role-specific technical knowledge','Planning and delivering work','Analysing information and solving problems','Communicating with stakeholders','Working with or leading teams','Using relevant digital tools']);
export const NO_EXPERIENCE='No hands-on experience yet';
export function competenciesForRole(targetRole=''){
 const role=String(targetRole||'').slice(0,120);
 return [...(ROLE_COMPETENCIES.find(item=>item.pattern.test(role))?.items||GENERAL_COMPETENCIES)];
}
export const QUICK_TEXT_LIMIT=300;
export const OTHER_TEXT_LIMIT=120;
export const QUESTIONS=Object.freeze([
 {id:'employmentStatus',kind:'single',text:'Which work situation best describes you right now?',options:['Employed full-time','Employed part-time','Self-employed','Between jobs','Returning to work','Student','Recent graduate']},
 {id:'currentRole',kind:'text',text:'What is your current or most recent job title?',placeholder:'e.g. Process Excellence Manager',maxLength:120,minLength:3},
 {id:'experience',kind:'single',text:'How much relevant practical experience do you have toward this career goal?',options:['No experience yet','Less than 1 year','1–3 years','4–7 years','8–12 years','13–20 years','Over 20 years']},
 {id:'goal',kind:'single',text:'Which career outcome matters most to you at this stage?',options:['Get promoted','Move to another company','Change careers','Return to work','Explore career options']},
 {id:'targetRole',kind:'text',text:'What specific role are you aiming for next?',placeholder:'e.g. Director of Process Excellence (or Still exploring)',maxLength:120,minLength:3},
 {id:'roleExperience',kind:'multi',text:'Which of these target-role skills have you actually used at work? Select up to 4.',options:[],maxSelections:4,minSelections:1},
 {id:'gaps',kind:'single',text:'Which skill would be your biggest stretch in the target role?',options:[]},
 {id:'applicationDepth',kind:'single',text:'How have you typically used the skills you selected?',options:['Still learning; not applied yet','Used with guidance or supervision','Applied independently in work, studies or projects','Used to solve problems, improve outcomes or guide others']},
 {id:'evidenceExample',kind:'text',text:'Describe one real example of using a relevant skill or preparing for your career goal.',placeholder:'e.g. I made a Power BI dashboard to show weekly service delays',maxLength:300,minLength:18,example:true,optional:true},
 // Deeper details only, after a purchase. Skip items answered in free discovery.
 {id:'responsibilities',kind:'multi',text:'Which responsibilities have you handled?',options:['Managing people','Improving processes','Leading projects','Analysing data','Working with customers','Other'],maxSelections:4,minSelections:1},
 {id:'skills',kind:'multi',text:'Which other skills could you demonstrate?',options:['Leading teams','Stakeholder communication','Solving problems','Project planning','Data analysis','Process improvement','Other'],maxSelections:5,minSelections:2},
 {id:'constraints',kind:'single',text:'How much time can you spend learning each week?',options:['Under 2 hours','2–4 hours','5–8 hours','More than 8 hours','Flexible / not sure']},
 {id:'achievement1',kind:'text',text:'What is one project or responsibility you have worked on?',placeholder:'e.g. Building an AI chatbot for HR queries',maxLength:QUICK_TEXT_LIMIT,minLength:18,example:true},
 {id:'achievement2',kind:'text',text:'What is another project or responsibility you handled?',placeholder:'e.g. Handling HR queries for employees',maxLength:QUICK_TEXT_LIMIT,minLength:18,example:true},
]);
export const FREE_QUESTION_IDS=Object.freeze(['employmentStatus','goal','targetRole','currentRole','experience','roleExperience','gaps','applicationDepth','evidenceExample']);
const known=Object.freeze(Object.fromEntries(QUESTIONS.map(q=>[q.id,q])));
const norm=v=>String(v??'').trim();
const nonempty=v=>typeof v==='string'&&v.trim().length>=2;
export function answeredByProfile(q,p={}){
 switch(q.id){
  case 'employmentStatus':return nonempty(p.employmentStatus);
  case 'currentRole':return typeof p.currentRole==='string'&&p.currentRole.trim().length>=3;
  case 'experience':return nonempty(p.experience);
  case 'applicationDepth':return nonempty(p.applicationDepth);
  case 'evidenceExample':return typeof p.evidenceExample==='string'&&looksLikeEvidence(p.evidenceExample);
  case 'goal':return nonempty(p.goal);
  case 'targetRole':return nonempty(p.targetRole);
  case 'roleExperience':return Array.isArray(p.roleExperience)&&p.roleExperience.some(nonempty);
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
 if(q.id==='roleExperience'){
  return {...q,text:['Student','Recent graduate','Student or recent graduate'].includes(p.employmentStatus)?'Which competencies have you practised in projects or internships?':q.text,options:[...competenciesForRole(p.targetRole),'Other',NO_EXPERIENCE]};
 }
 if(q.id==='applicationDepth'&&(p.roleExperience||[]).includes(NO_EXPERIENCE))return {...q,text:'How far have you explored or prepared for your chosen career?',options:['Just exploring; no related learning or practice yet','Started learning the basics','Tried a tutorial or class activity','Completed a related personal or academic project']};
 if(q.id==='evidenceExample'&&['Student','Recent graduate','Student or recent graduate'].includes(p.employmentStatus))return {...q,text:'Describe one project, class activity or learning experience related to the career you want.',placeholder:'e.g. I analysed survey responses for a college project'};
 if(q.id==='evidenceExample'&&p.applicationDepth==='Still learning; not applied yet')return {...q,text:'What is one learning activity you have completed towards this career? (Optional)',placeholder:'e.g. I completed a spreadsheet course and practised cleaning a dataset'};
 if(q.id==='gaps'){
  return {...q,options:[...competenciesForRole(p.targetRole),'Interview preparation','Not sure yet','Other']};
 }
 if(['Student','Recent graduate','Student or recent graduate'].includes(p.employmentStatus)){
  if(q.id==='currentRole')return {...q,text:'What course, qualification or main subject are you studying, or have you recently completed?',placeholder:'e.g. Class 12 commerce, BBA, BTech Computer Science'};
  if(q.id==='responsibilities')return {...q,text:'Which activities have you practised in projects or internships?'};
  if(q.id==='achievement1')return {...q,text:'What is one project, internship or activity you completed?',placeholder:'e.g. Led a college project that analysed customer feedback'};
  if(q.id==='achievement2')return {...q,text:'What is another project or result you can describe?',placeholder:'e.g. Coordinated volunteers to deliver a college event on time'};
 }
 if(p.employmentStatus==='Returning to work'&&q.id==='currentRole')return {...q,text:'What was your last role, or your main area of experience?',placeholder:'e.g. HR coordinator, or entering the workforce'};
 if(p.employmentStatus==='Between jobs'&&q.id==='currentRole')return {...q,text:'What was your most recent job title?'};
 if(q.id==='goal'&&['Student','Recent graduate','Student or recent graduate'].includes(p.employmentStatus))return {...q,text:'What is your main career goal right now?',options:['Explore career options','Find my first job or internship','Build job-ready skills','Plan further studies','Change my field of study']};
 if(q.id==='experience'&&['Student','Recent graduate','Student or recent graduate'].includes(p.employmentStatus))return {...q,text:'How much relevant experience do you have from internships, projects, volunteering or paid work?'};
 if(q.id==='targetRole'&&['Student','Recent graduate','Student or recent graduate'].includes(p.employmentStatus))return {...q,text:'Which career or role interests you most? You may write “Still exploring”.',placeholder:'e.g. Data Analyst, UX Designer, or Still exploring'};
 return q;
}
function publicQuestion(q){
 if(!q)return null;
 const {id,kind,text,options,maxSelections,minSelections,maxLength,minLength,placeholder,optional,example}=q;
 return {id,kind,text,options:options||[],maxSelections:maxSelections||1,minSelections:minSelections||1,maxLength:maxLength||OTHER_TEXT_LIMIT,minLength:minLength||1,placeholder:placeholder||'',optional:!!optional,example:!!example};
}
export function guidedProgress(p={},answers={},skips=[],phase='paid'){
 const questionSet=phase==='free'?FREE_QUESTION_IDS.map(id=>known[id]):QUESTIONS.filter(q=>!['applicationDepth','evidenceExample'].includes(q.id));
 const completed=questionSet.filter(q=>answeredByProfile(q,p)||Object.hasOwn(answers,q.id)||skips.includes(q.id)).length;
 const next=questionSet.find(q=>!answeredByProfile(q,p)&&!Object.hasOwn(answers,q.id)&&!skips.includes(q.id));
 return {completed,total:questionSet.length,question:publicQuestion(next?adaptQuestion(next,p):null),finished:!next,
  skipped:skips.filter(id=>!!known[id])};
}
// Cheap, deterministic checks. Do not attempt to infer truth or competence here.
export function isObviousNonsense(v){
 const s=norm(v).toLowerCase().replace(/\s+/g,' ');
 const words=s.split(' ');
 if(/^(?:asdf|qwerty|zxcv|blah|lorem ipsum|test test|123456|abcde)/i.test(s))return true;
 if(/^([a-z0-9]{1,4})\1{3,}$/i.test(s.replace(/\s/g,'')))return true;
 if(/^(.)\1{5,}$/u.test(s.replace(/\s/g,'')))return true;
 if(words.length>=3&&new Set(words).size===1)return true;
 if(/\b(?:ignore previous instructions|system prompt|write me a poem|drop table)\b/i.test(s))return true;
 return false;
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
  if(q.example&&isObviousNonsense(value))throw new Error('Please describe a real project, task or learning activity, or select Skip if you have no example yet.');
  if(q.example&&!looksLikeEvidence(value))throw new Error('Please give one specific task, project or learning activity you actually completed, or select Skip.');
  return {value,other:''};
 }
 const selections=q.kind==='multi'?raw?.value:[raw?.value];
 if(!Array.isArray(selections)||!selections.length||selections.some(v=>typeof v!=='string'||!q.options.includes(v)))throw new Error('Please select an available option.');
 const unique=[...new Set(selections)];
 if(unique.length!==selections.length)throw new Error('Select each option only once.');
 if(unique.length<(q.minSelections||1)||unique.length>(q.maxSelections||1))throw new Error(`Select ${q.minSelections||1} to ${q.maxSelections||1} options.`);
 if(unique.includes(NO_EXPERIENCE)&&unique.length!==1)throw new Error('Choose No hands-on experience yet on its own.');
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
  case 'experience':fields.experience=v;break;
  case 'applicationDepth':fields.applicationDepth=v;break;
  case 'evidenceExample':fields.evidenceExample=v;fields.achievements=[v];break;
  case 'goal':fields.goal=v;break;
  case 'targetRole':fields.targetRole=v;break;
  case 'roleExperience':{
   fields.roleExperience=resolved;
   const practised=resolved.filter(x=>x!==NO_EXPERIENCE);
   if(practised.length){
    fields.skills=practised;
    // These are self-reported areas of practice, not independently validated achievements.
    fields.responsibilities=practised.map(x=>`Experience with ${x}`);
   }
   break;
  }
  case 'responsibilities':fields.responsibilities=resolved;break;
  case 'skills':fields.skills=resolved;break;
  case 'gaps':fields.gaps=resolved.map(x=>x==='Not sure yet'?'Not sure which development gap to prioritise':x);break;
  case 'constraints':fields.constraints=`Learning time per week: ${v}`;break;
  case 'achievement1':case 'achievement2':fields.achievements=[v];break;
  default:throw new Error('Unknown question.');
 }
 return mergeProfile(profile,fields);
}
// Rebuild from saved selections rather than merging into stale arrays. This is
// local validation only: backtracking makes no model calls or coaching charges.
export function rewindFreeAnswers(answers={},extras={},profile={},skips=[]){
 const order=FREE_QUESTION_IDS.filter(id=>Object.hasOwn(answers,id)||skips.includes(id));
 if(!order.length)return null;
 const previousId=order.at(-1);
 const remaining={...answers};delete remaining[previousId];
 const remainingExtras={...extras};delete remainingExtras[previousId];
 const remainingSkips=skips.filter(id=>id!==previousId);
 let rebuilt={employmentStatus:'',currentRole:'',experience:'',goal:'',targetRole:'',roleExperience:[],responsibilities:[],skills:[],gaps:[],achievements:[],constraints:'',industry:'',timeframe:'',applicationDepth:'',evidenceExample:''};
 for(const id of FREE_QUESTION_IDS){
  if(!Object.hasOwn(remaining,id))continue;
  const base=QUESTIONS.find(item=>item.id===id);
  const q=publicQuestion(adaptQuestion(base,rebuilt));
  // Sessions saved before V5.11 retained the resolved Other text only in profile.
  // Recover it when possible rather than making existing users restart the form.
  let other=remainingExtras[id]||'';
  const hasOther=Array.isArray(remaining[id])?remaining[id].includes('Other'):remaining[id]==='Other';
  if(hasOther&&!other){
   if(id==='roleExperience')other=(profile.roleExperience||[]).find(x=>x!==NO_EXPERIENCE&&!q.options.includes(x))||'';
   if(id==='gaps')other=(profile.gaps||[]).find(x=>x&&!q.options.includes(x))||'';
  }
  const answer=validateQuickAnswer(q,{value:remaining[id],other});
  rebuilt=addQuickAnswer(rebuilt,q,answer);
 }
 return {previousId,previousValue:answers[previousId]||'',previousOther:extras[previousId]||'',answers:remaining,extras:remainingExtras,skips:remainingSkips,profile:rebuilt};
}
export function displayQuickAnswer(q,answer){
 if(q.kind==='text')return answer.value;
 if(Array.isArray(answer.value))return answer.value.map(v=>v==='Other'?answer.other:v).join(' · ');
 return answer.value==='Other'?answer.other:answer.value;
}
export function validateSkip(q){
 if(!q||!q.optional)throw new Error('This information is needed for your career profile. Please answer using the options provided.');
 return q.id;
}
