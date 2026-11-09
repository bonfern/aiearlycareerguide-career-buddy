import crypto from 'node:crypto';
import {BROWSER_ID_PATTERN} from './free-browser.js';
export const guestSessionId=()=>crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex');
export const guestExpiry=(time=Date.now())=>time+7*86400000;
export const guestAllowed=action=>new Set(['guestStart','funnelEvent','config','state','logout','quick','quickBack','freeReport','download','setJourney']).has(action);
export const funnelDay=(time=Date.now())=>new Date(time+330*60000).toISOString().slice(0,10);
export function visitorKey(browserId,secret,sessionId=''){
 const id=BROWSER_ID_PATTERN.test(String(browserId||''))?browserId.toLowerCase():sessionId;
 if(!id||!secret)return null;
 return crypto.createHmac('sha256',secret).update('career-funnel:'+id).digest('hex');
}
export function assertGuestOrigin(body,{consentVersion}){
 if(body?.adultConfirmed!==true||body?.privacyAccepted!==true||body?.consentVersion!==consentVersion)throw Object.assign(new Error('Please confirm you are at least 18 and review the Privacy Policy before starting.'),{status:400});
}
