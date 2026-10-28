export const MESSAGE_LIMIT=1200;
export const PACKS=Object.freeze({
 intro:{label:'Career Buddy Intro Coaching',priceInr:149,credits:12,days:14},
 starter:{label:'Premium Career Assessment + Career Buddy',priceInr:499,credits:40,days:30},
 standard:{label:'Standard Refill',priceInr:249,credits:30,days:30},
 extended:{label:'Extended Refill',priceInr:399,credits:60,days:60}
});
export function validateMessage(v){
 if(typeof v!=='string')throw new Error('Please enter a message.');
 const s=v.trim();
 if(!s)throw new Error('Please enter a message.');
 if(s.length>MESSAGE_LIMIT)throw new Error(`Your message must be ${MESSAGE_LIMIT} characters or fewer.`);
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s))throw new Error('Unsupported control characters.');
 return s;
}
export const EMPTY_PROFILE=Object.freeze({
 employmentStatus:'',currentRole:'',industry:'',experience:'',goal:'',targetRole:'',timeframe:'',
 responsibilities:[],roleExperience:[],achievements:[],skills:[],gaps:[],constraints:'',applicationDepth:'',evidenceExample:''
});
const text=(v,max=240)=>typeof v==='string'?v.replace(/\s+/g,' ').trim().slice(0,max):'';
function uniqueArr(old, incoming){
 const base=Array.isArray(old)?old:[];
 const next=Array.isArray(incoming)?incoming:[];
 const out=[];
 for(const item of [...base,...next]){
  const s=text(item,240);
  if(s.length>=5&&!out.some(v=>v.toLowerCase()===s.toLowerCase()))out.push(s);
 }
 return out.slice(-12);
}
export function mergeProfile(current={},candidate={}){
 const out={...EMPTY_PROFILE,...current};
 for(const k of ['employmentStatus','currentRole','industry','experience','goal','targetRole','timeframe','constraints','applicationDepth','evidenceExample']){
  const v=text(candidate?.[k]);if(v)out[k]=v;
 }
 for(const k of ['responsibilities','roleExperience','achievements','skills','gaps'])out[k]=uniqueArr(out[k],candidate?.[k]);
 return out;
}
// Treat concise descriptions of past and ongoing *work* as career examples.
// These are self-reported examples, not independently verified achievements.
export function looksLikeEvidence(v){
 if(typeof v!=='string')return false;
 const s=v.replace(/\s+/g,' ').trim();
 if(s.length<18 || s.split(/\s+/).length<3)return false;
 // A generic personal claim is not a concrete project, result or responsibility.
 if(/^(?:none|n\/?a|not sure|don\'?t know|no example|nothing|i am good at|i have good skills|i am (?:very )?(?:skilled|capable|excellent)|i have strong skills)/i.test(s))return false;
 if(/\b(?:everything|anything|something|stuff|all sorts of things)\b/i.test(s))return false;
 // Include present tense and progressive forms. "Building an AI chatbot for
 // HR queries" and "Handling employee queries" are legitimate examples.
 return /\b(?:led|lead|leading|managed?|manages|managing|built|build|building|created?|creating|delivered?|delivering|implemented?|implementing|improved?|improving|reduced?|reducing|increased?|increasing|saved?|saving|coordinated?|coordinating|organis(?:ed|ing|e)|organiz(?:ed|ing|e)|completed?|completing|handled?|handling|supported?|supporting|trained?|training|launched?|launching|designed?|designing|analys(?:ed|ing|e)|analyz(?:ed|ing|e)|automated?|automating|achieved?|achieving|developed?|developing|resolved?|resolving|worked?|working|responsible|helped?|helping|grew|growing|streamlined?|streamlining|introduced?|introducing|mentored?|mentoring|ran|running|conducted?|conducting|prepared?|preparing|volunteered?|volunteering|planned?|planning|executed?|executing|collaborated?|collaborating|won|earned?|produced?|producing|maintained?|maintaining|oversaw|overseeing|initiated?|initiating|operated?|operating|facilitated?|facilitating|reviewed?|reviewing|drafted?|drafting)\b/i.test(s) || /(?:\d+\s*%|on time|ahead of schedule|hours saved|per cent|percent)/i.test(s);
}
// Lightweight, low-cost pre-purchase readiness. There is no free full skills diagnosis.
export function freeReadiness(p={}){
 const missing=[];
 const ok=v=>typeof v==='string'&&v.trim().length>=3;
 if(!ok(p.employmentStatus)||!ok(p.currentRole)||!ok(p.experience))missing.push('Your current situation, education or role, and relevant experience (including none)');
 if(!ok(p.goal)||!ok(p.targetRole))missing.push('Career goal and target role');
 if(!(Array.isArray(p.roleExperience)&&p.roleExperience.length>0)&&!((p.responsibilities||[]).length>0&&(p.skills||[]).length>=2))missing.push('Experience with target-role competencies');
 if(!Array.isArray(p.gaps)||p.gaps.length<1)missing.push('Area to develop (or not sure)');
 return {ready:missing.length===0,missing,completed:4-missing.length,total:4};
}
export function checkPackEligibility(session={},packId){
 const tier=session.tier||'free',hasCoaching=['coach','paid'].includes(tier)||Number(session.creditsGranted)>0;
 if(!Object.hasOwn(PACKS,packId))throw new Error('Invalid pack.');
 if(packId==='intro'&&!session.freeReport)throw new Error('Complete your free career snapshot before starting Career Buddy coaching.');
 if(packId==='intro'&&hasCoaching)throw new Error('The introductory coaching pack is for new coaching users. Choose a refill.');
 if(packId==='starter'&&!session.freeReport)throw new Error('Complete the free snapshot before unlocking the detailed assessment.');
 if(packId==='starter'&&tier==='paid')throw new Error('Use a refill pack for additional coaching.');
 if(['standard','extended'].includes(packId)&&!hasCoaching)throw new Error('Start with a coaching intro or detailed assessment pack.');
 if(['standard','extended'].includes(packId)&&!session.freeReport)throw new Error('Complete your free career snapshot before purchasing coaching refills.');
 return packId==='starter'?'paid':packId==='intro'?'coach':tier;
}
export function computeOffer({packId,couponCode='',coupons={}}){
 const pack=PACKS[packId];if(!pack)throw new Error('Invalid pack.');
 const code=String(couponCode||'').trim().toUpperCase();
 if(code&&!/^[A-Z0-9_-]{3,24}$/.test(code))throw new Error('Invalid coupon format.');
 const percent=code?coupons[code]:0;
 if(code&&(!Number.isInteger(percent)||percent<1||percent>100))throw new Error('Coupon is not valid.');
 return {packId,label:pack.label,credits:pack.credits,days:pack.days,originalPriceInr:pack.priceInr,
  coupon:code||null,discountPercent:percent||0,priceInr:Math.round(pack.priceInr*(100-(percent||0))/100)};
}
export function reportReadiness(p={}){
 const missing=[];
 const has=s=>typeof s==='string'&&s.trim().length>=3;
 if(!has(p.employmentStatus)||!has(p.currentRole)||!has(p.experience))missing.push('Current situation, role and experience');
 if(!has(p.goal)||!has(p.targetRole))missing.push('Career objective and target direction');
 if(!Array.isArray(p.responsibilities)||p.responsibilities.filter(s=>has(s)).length<1)missing.push('Current or past responsibilities');
 if(!Array.isArray(p.achievements)||p.achievements.filter(looksLikeEvidence).length<2)missing.push('Two concrete achievements or equivalent examples');
 if(!Array.isArray(p.skills)||p.skills.filter(has).length<2)missing.push('At least two relevant skills');
 if(!Array.isArray(p.gaps)||p.gaps.filter(has).length<1)missing.push('A potential development gap or skill to validate');
 if(!has(p.constraints))missing.push('Time, learning budget or mobility constraints (including none)');
 return {ready:missing.length===0,missing,completed:7-missing.length,total:7};
}
export function creditWarning(n){if(n<=0)return 'Your coaching credits are exhausted. Your report and history remain available.';
 if(n<=1)return 'Final interaction: only 1 credit remains.';
 if(n<=5)return `Low balance: ${n} interactions remaining. A refill will be needed soon.`;
 if(n<=10)return `${n} interactions remaining. Consider a refill before they run out.`;
 return '';
}
export const MODEL_PRICES_USD_PER_MILLION=Object.freeze({
 'gpt-6-astra':[10,50], 'gpt-6.1-sol':[2,10], 'gpt-6-luna':[.1,.5]
});
export function estimateUsage(usage,env,model=''){
 const input=Number(usage?.prompt_tokens||usage?.input_tokens||0),output=Number(usage?.completion_tokens||usage?.output_tokens||0);
 const selected=MODEL_PRICES_USD_PER_MILLION[String(model||'').toLowerCase()];
 // Generic rates can be overridden in Vercel for an older chat model.
 const ir=selected?selected[0]:Number(env.OPENAI_INPUT_USD_PER_MILLION||0);
 const or=selected?selected[1]:Number(env.OPENAI_OUTPUT_USD_PER_MILLION||0);
 const fx=Number(env.OPENAI_USD_INR||0);
 const usd=ir>0&&or>0?(input*ir+output*or)/1e6:null;
 return {inputTokens:input,outputTokens:output,totalTokens:input+output,usdCost:usd,
  inrCost:usd!==null&&fx>0?usd*fx:null,
  modelRateConfigured:usd!==null,exchangeRateConfigured:fx>0};
}

export function validId(v){return typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);}
