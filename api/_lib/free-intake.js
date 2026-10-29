/* V5.21: seven core questions, with one interest question only for users
   who are exploring. All three-choice answers are self-reported; no AI during intake. */
export const FREE_INTAKE_VERSION=21;
export const FREE_QUESTIONS=Object.freeze([
 {id:'careerStage',kind:'single',text:'Where are you in your career journey right now?',options:['School Student','College / University Student','Early Career (0-3 years)','Mid-Career Professional (4-10 years)','Experienced Professional (10+ years)','Manager / Team Leader','Senior Leader / Executive','Returning to Work After a Break','Other']},
 {id:'targetGoalRole',kind:'text',text:'What specific career role or direction are you aiming for?',placeholder:'e.g. Data Analyst, Project Manager, or Still exploring',maxLength:100,minLength:3},
 {id:'careerPriorities',kind:'multi',text:'What are your top career priorities for the next 2–3 years?',options:['Grow in my current role','Get promoted','Earn a higher salary','Change to a different role','Move into a new industry','Move into leadership','Build future-ready skills','Find my first job or internship','Find a stable and secure role','Start a business or freelance','Return to work after a break','Other'],maxSelections:3},
 {id:'interestFields',kind:'multi',conditional:'exploring',text:'Which career fields interest you most?',options:['Technology & Software','Data & Analytics','Artificial Intelligence (AI)','Finance & Accounting','Sales & Business Development','Marketing','Operations & Supply Chain','Project Management','Human Resources','Customer Experience','Product Management','Consulting','Design & Creativity','Education & Training','Healthcare','Research','Entrepreneurship','Other'],maxSelections:3},
 {id:'personalStrengths',kind:'multi',text:'What are your top three strengths or skills?',options:['Solving problems','Analysing data and information','Communicating ideas clearly','Leading and motivating others','Building relationships and networks','Creative thinking','Attention to detail','Planning and organising work','Making decisions','Negotiating and influencing','Technical expertise','Teaching or mentoring','Research and investigation','Sales and persuasion','Other'],maxSelections:3,detailLabel:'Optional: Name tools, certifications, or one task where you used a skill',detailPlaceholder:'e.g. Built Excel reports, learned Python, completed a college design project',detailMaxLength:300},
 {id:'educationLevel',kind:'single',text:'What is your highest education or qualification?',options:['High School','Diploma',"Bachelor's Degree","Master's Degree",'MBA','Professional Certification(s)','Doctorate / PhD','Other']},
 {id:'careerBarriers',kind:'multi',text:'What are your biggest barriers to reaching your career goal?',options:['Missing technical or job-specific skills','Limited hands-on experience','Unclear career path or requirements','Need a qualification or certification','Not getting interview calls','Getting interviews but no offers','Limited time for learning','Limited money for training','Lack of confidence or support','Not sure what is holding me back','No major barrier right now','Other'],maxSelections:3},
 {id:'learningTime',kind:'single',text:'How much time can you realistically spend on career development each week?',options:['Less than 1 hour','1-3 hours','4-6 hours','7-10 hours','More than 10 hours','Other']}
]);
export const FREE_QUESTION_IDS=Object.freeze(FREE_QUESTIONS.map(q=>q.id));
export const FREE_BY_ID=Object.freeze(Object.fromEntries(FREE_QUESTIONS.map(q=>[q.id,q])));
export function isExploringGoal(value=''){
 const s=String(value||'').trim().toLowerCase().replace(/[.!?]+$/,'');
 return /^(?:still exploring|exploring|not sure|unsure|undecided|i don.t know|no specific role yet|open to options|not decided yet|career exploration)$/.test(s);
}
export function activeFreeQuestions(answers={}){
 return FREE_QUESTIONS.filter(q=>q.conditional!=='exploring'||isExploringGoal(answers.targetGoalRole));
}
export function freeAnswered(answers={},skips=[]){
 return activeFreeQuestions(answers).filter(q=>Object.hasOwn(answers,q.id)||skips.includes(q.id)).map(q=>q.id);
}
export function freeIntakeComplete(answers={},skips=[]){return freeAnswered(answers,skips).length===activeFreeQuestions(answers).length;}
const flat=v=>String(v||'').replace(/\s+/g,' ').trim();
export function applyFreeAnswers(answers={},extras={},skips=[]){
 const resolved=id=>{
  const v=answers[id],other=typeof extras[id]==='string'?extras[id]:'';
  return (Array.isArray(v)?v:[v]).filter(x=>typeof x==='string').map(x=>x==='Other'?other:x).map(flat).filter(Boolean);
 };
 const single=id=>resolved(id)[0]||'';
 const stage=single('careerStage'),target=single('targetGoalRole'),exploring=isExploringGoal(target);
 const interests=exploring?resolved('interestFields').slice(0,3):[];
 const strengths=resolved('personalStrengths').slice(0,3);
 const priorities=resolved('careerPriorities').slice(0,3);
 const barriers=resolved('careerBarriers').slice(0,3);
 const skillDetail=flat(extras.strengthEvidence).slice(0,300);
 const selfReportedTools=skillDetail.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean).slice(0,8);
 const isStudent=/student/i.test(stage),experience=/^Early Career/.test(stage)?'0–3 years':/^Mid-Career/.test(stage)?'4–10 years':/^Experienced/.test(stage)?'10+ years':isStudent?'No experience yet':'Not specified';
 const initialGoal=priorities.length?priorities.join('; '):'Explore career options';
 const direction=exploring?`Career fields in ${interests.join(' and ')||'exploration'}`:target||'Career direction to explore';
 return {
  freeIntakeVersion:FREE_INTAKE_VERSION,careerStage:stage,employmentStatus:stage,
  careerSituations:priorities,careerPriorities:priorities,interestFields:interests,personalStrengths:strengths,
  careerBarriers:barriers,educationLevel:single('educationLevel'),existingSkills:skillDetail,
  careerAmbition:initialGoal,learningTime:single('learningTime'),targetGoalRole:target,
  experience,goal:exploring?initialGoal:`${initialGoal}; target: ${target||'not selected'}`,
  targetRole:direction,assessmentTargetRole:'',currentRole:stage||'Career exploration',
  roleExperience:selfReportedTools,skills:selfReportedTools,skillEvidence:skillDetail,
  responsibilities:[],gaps:barriers,achievements:[],constraints:single('learningTime')?`Learning time per week: ${single('learningTime')}`:'',
  industry:interests[0]||'',timeframe:'2–3 years',applicationDepth:'',evidenceExample:'',
  // Legacy fields are intentionally clear: no inferred workplace experience.
  enjoyedWork:[],workEnvironment:[],changeComfort:'',careerValues:[],additionalContext:''
 };
}
