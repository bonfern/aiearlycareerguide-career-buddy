/* V5.18 Free Career Discovery: exactly 13 low-cost, structured questions.
   All selections are user-reported, never verified skills. No LLM calls during intake. */
export const FREE_QUESTIONS=Object.freeze([
 {id:'careerStage',kind:'single',text:'Where are you in your career journey right now?',options:['School Student','College / University Student','Early Career (0-3 years)','Mid-Career Professional (4-10 years)','Experienced Professional (10+ years)','Manager / Team Leader','Senior Leader / Executive','Returning to Work After a Break','Other']},
 {id:'careerSituation',kind:'multi',text:'What best describes your current career situation?',options:['I want to grow in my current role','I want a promotion','I want to switch to a different role','I want to move to a different industry','I want to earn more',"I'm struggling to get interview calls","I'm getting interviews but not job offers","I'm unsure about my next career move",'I want to move into a leadership role','I want to start my own business or freelance','Other'],maxSelections:11},
 {id:'interestFields',kind:'multi',text:'Which fields or subjects interest you the most?',options:['Technology & Software','Data & Analytics','Artificial Intelligence (AI)','Finance & Accounting','Sales & Business Development','Marketing','Operations & Supply Chain','Project Management','Human Resources','Customer Experience','Product Management','Consulting','Design & Creativity','Education & Training','Healthcare','Research','Entrepreneurship','Other'],maxSelections:5},
 {id:'personalStrengths',kind:'multi',text:'What do you consider to be your biggest strengths?',options:['Solving problems','Analyzing data and information','Communicating ideas clearly','Leading and motivating others','Building relationships and networks','Creative thinking','Attention to detail','Planning and organizing work','Making decisions','Negotiating and influencing others','Technical expertise','Teaching or mentoring others','Research and investigation','Sales and persuasion','Other'],maxSelections:5},
 {id:'enjoyedWork',kind:'multi',text:'Which types of work do you enjoy the most?',options:['Solving complex challenges','Working with data and numbers','Creating new ideas or solutions','Leading people and teams','Helping customers or clients','Teaching, coaching, or mentoring','Building technology or digital solutions','Managing projects and deadlines','Influencing business decisions','Learning and researching new topics','Other'],maxSelections:3},
 {id:'workEnvironment',kind:'multi',text:'What kind of work environment helps you perform at your best?',options:['Structured and organized','Fast-paced and dynamic','Team-oriented and collaborative','Independent and flexible','Customer-facing','Remote or hybrid working','Leadership-focused','Innovation and experimentation','Other'],maxSelections:3},
 {id:'educationLevel',kind:'single',text:'What is your highest level of education or qualification?',options:['High School','Diploma',"Bachelor's Degree","Master's Degree",'MBA','Professional Certification(s)','Doctorate / PhD','Other']},
 {id:'existingSkills',kind:'text',text:'What skills, tools, certifications, or technologies do you currently have experience with?',placeholder:'e.g. Excel, Python, SAP, Power BI, Six Sigma, marketing, sales',maxLength:500,minLength:2,optional:true,skipLabel:'No experience yet / Not applicable'},
 {id:'careerAmbition',kind:'single',text:'What is your biggest career goal for the next 2–3 years?',options:['Get promoted','Earn a higher salary','Move into leadership','Become a recognised expert in my field','Change careers','Move into a new industry','Find a stable and secure role','Start a business','Build future-ready skills','Other']},
 {id:'learningTime',kind:'single',text:'How much time can you realistically dedicate each week to learning and developing new skills?',options:['Less than 1 hour','1-3 hours','4-6 hours','7-10 hours','More than 10 hours','Other']},
 {id:'changeComfort',kind:'single',text:'How comfortable are you with stepping outside your comfort zone to pursue new career opportunities?',options:['Not comfortable at all','Slightly comfortable','Moderately comfortable','Very comfortable','Extremely comfortable','Other']},
 {id:'careerValues',kind:'multi',text:'What matters most to you in your career?',options:['Higher income','Leadership opportunities','Job security','Flexible working arrangements','Meaningful and impactful work','Innovation and creativity','Healthy work-life balance','Starting my own business','International or global opportunities','Continuous learning and growth','Recognition and influence','Other'],maxSelections:3},
 {id:'additionalContext',kind:'text',text:"Is there anything else you'd like us to know about your career aspirations, preferences, or challenges?",placeholder:'Optional – add any details that may help us personalise your snapshot',maxLength:500,minLength:3,optional:true,skipLabel:'N/A'}
]);
export const FREE_QUESTION_IDS=Object.freeze(FREE_QUESTIONS.map(q=>q.id));
export const FREE_BY_ID=Object.freeze(Object.fromEntries(FREE_QUESTIONS.map(q=>[q.id,q])));
export function freeAnswered(answers={},skips=[]){return FREE_QUESTION_IDS.filter(id=>Object.hasOwn(answers,id)||skips.includes(id));}
export function freeIntakeComplete(answers={},skips=[]){return freeAnswered(answers,skips).length===FREE_QUESTION_IDS.length;}
export function applyFreeAnswers(answers={},extras={},skips=[]){
 const resolved=id=>{const v=answers[id];const other=extras[id]||'';return (Array.isArray(v)?v:[v]).filter(x=>typeof x==='string').map(x=>x==='Other'?other:x).filter(Boolean);};
 const single=id=>resolved(id)[0]||'';
 const interests=resolved('interestFields'),stage=single('careerStage'),skills=skips.includes('existingSkills')?'':single('existingSkills');
 const initialGoal=single('careerAmbition')||resolved('careerSituation')[0]||'Explore career options';
 const isStudent=/student/i.test(stage);
 const experience=/^Early Career/.test(stage)?'0–3 years':/^Mid-Career/.test(stage)?'4–10 years':/^Experienced/.test(stage)?'10+ years':isStudent?'No experience yet':'Not specified';
 const directions=interests.length?interests.slice(0,2).join(' and '):'general career opportunities';
 // These are interest areas, NOT confirmed target job titles. Premium requires a role selection.
 return {
  freeIntakeVersion:18,careerStage:stage,employmentStatus:stage,
  careerSituations:resolved('careerSituation'),interestFields:interests,personalStrengths:resolved('personalStrengths'),
  enjoyedWork:resolved('enjoyedWork'),workEnvironment:resolved('workEnvironment'),educationLevel:single('educationLevel'),
  existingSkills:skills,careerAmbition:initialGoal,learningTime:single('learningTime'),changeComfort:single('changeComfort'),
  careerValues:resolved('careerValues'),additionalContext:skips.includes('additionalContext')?'':single('additionalContext'),
  experience,goal:initialGoal,targetRole:`Career paths in ${directions}`,currentRole:stage||'Career exploration',
  roleExperience:skills?skills.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean).slice(0,12):[],
  skills:skills?skills.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean).slice(0,12):[],
  responsibilities:[],gaps:[],achievements:[],constraints:single('learningTime')?`Learning time per week: ${single('learningTime')}`:'',
  industry:interests[0]||'',timeframe:'2–3 years',applicationDepth:'',evidenceExample:''
 };
}
