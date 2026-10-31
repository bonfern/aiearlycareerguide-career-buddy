import crypto from 'node:crypto';
export const FEEDBACK_COLLECTION='buddyUserFeedbackV1';
export const FEEDBACK_STAGES=['free','premium','chat'];
export const FEEDBACK_CATEGORIES=['content','depth','technical','other'];
export function isFeedbackAdmin(email,allowlist=process.env.FEEDBACK_ADMIN_EMAILS||''){
 const allowed=String(allowlist).split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 return allowed.length>0&&allowed.includes(String(email||'').trim().toLowerCase());
}
export function parseFeedback(body={}){
 const stage=String(body.stage||''),rating=Number(body.rating),category=String(body.category||''),comment=String(body.comment||'').trim();
 if(!FEEDBACK_STAGES.includes(stage))throw Error('Select a valid feedback stage.');
 if(!Number.isInteger(rating)||rating<1||rating>5)throw Error('Select a rating from 1 to 5.');
 if(!FEEDBACK_CATEGORIES.includes(category))throw Error('Select a feedback category.');
 if(comment.length>1000)throw Error('Feedback comments must be 1,000 characters or fewer.');
 const anchor=stage==='chat'?String(body.anchor||''):stage;
 if(stage==='chat'&&!/^\d{10,16}$/.test(anchor))throw Error('Select a completed Career Buddy answer to rate.');
 return {stage,rating,category,comment,anchor};
}
export function feedbackId(sessionId,stage,anchor){return crypto.createHash('sha256').update(`${sessionId}|${stage}|${anchor}`).digest('hex').slice(0,48);}
export function canRateFeedback(s,stage,anchor){
 if(stage==='free')return !!s.freeReport;
 if(stage==='premium')return !!s.report;
 return (s.messages||[]).some(m=>m.role==='assistant'&&m.at&&String(m.at)===anchor);
}
export function publicFeedback(doc={}){
 const {id,stage,rating,category,comment,createdAt,updatedAt,status}=doc;
 return {id,stage,rating,category,comment,createdAt,updatedAt,status:status||'visible'};
}
