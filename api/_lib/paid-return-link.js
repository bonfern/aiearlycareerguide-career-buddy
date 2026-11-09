/* No OTP at checkout: a successful purchase stays tied to its own random session.
   A one-use emailed link later proves mailbox control for cross-device recovery.
   In particular, an unverified checkout never claims an existing email-key account. */
import crypto from 'node:crypto';
import {normalizeEmail} from './identity.js';
export const RETURN_LINKS_COLLECTION='buddyPaidReturnLinksV1';
export const RETURN_LINK_TTL=7*86400000;
export const RETURN_URL='https://www.aiearlycareerguide.com/professionals/';
export function linkHash(token,secret){
 if(!/^[a-f0-9]{64}$/.test(String(token||''))||!secret||secret.length<32)throw Error('Invalid return link.');
 return crypto.createHmac('sha256',secret).update('paid-return-link-v1:'+token).digest('hex');
}
export function isCheckoutIdentity(session){return session?.authMethod==='checkout-email-unverified'&&session?.emailVerified!==true;}
export function requireCheckoutEmail(body,version){
 const email=normalizeEmail(body?.email);
 if(body?.privacyConsent!==true||body?.adultConfirmed!==true||body?.consentVersion!==version)throw Error('Confirm your age and review the privacy terms before checkout.');
 // Common errors are flagged instead of silently treating them as verified.
 if(/\.(?:con|cmo|comm|cm)$/.test(email)||/@(?:gmial|gmai|gmal|yaho|outlok|hotmal)\./.test(email))throw Error('Please check the email address spelling before payment.');
 return email;
}
export async function sendPaidReturnLink(store,session,{baseUrl=RETURN_URL,send=globalThis.fetch}={}){
 if(!['checkout-email-unverified','email-return-link'].includes(session?.authMethod)||!['paid','coach'].includes(session.tier))return {sent:false,reason:'not-required'};
 const id=session.id,ref=store.collection('buddyPaidReturnLinkRequestsV1').doc(id),time=Date.now();
 let token=crypto.randomBytes(32).toString('hex'),hash=linkHash(token,process.env.PREVIEW_SESSION_SECRET);
 const gate=await store.runTransaction(async tx=>{
  const snap=await tx.get(ref),previous=snap.data()||{};
  if(previous.email===session.email&&previous.status==='sent'&&time-previous.at<3600000)return false;
  if(previous.email===session.email&&previous.status==='sending'&&time-previous.at<120000)return false;
  tx.set(ref,{status:'sending',at:time,email:session.email});return true;
 });
 if(!gate)return {sent:false,reason:'already-issued'};
 try{
  const linkRef=store.collection(RETURN_LINKS_COLLECTION).doc(hash);
  await linkRef.create({sessionId:id,email:normalizeEmail(session.email),createdAt:time,expiresAt:time+RETURN_LINK_TTL,redeemedAt:null});
  const url=new URL(baseUrl);
  if(url.protocol!=='https:'||url.hostname!=='www.aiearlycareerguide.com'||url.pathname!=='/professionals/')throw Error('Untrusted recovery destination.');
  url.hash=`resume=${token}`;
  const response=await send('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL,to:[session.email],subject:'Your AI Early Career Guide purchase and secure return link',
    html:`<p>Your Career Buddy purchase is ready.</p><p>Continue on your current device immediately, or <a href="${url.toString()}">use this secure one-time return link</a> on another device.</p><p>The link expires in seven days and works only once. If you didn't make this purchase, please ignore this email.</p><p>AI Early Career Guide</p>`}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Transactional email provider rejected the return-link email.');
  await ref.set({status:'sent',at:time,email:session.email});return {sent:true};
 }catch(e){await ref.set({status:'failed',at:time,email:session.email}).catch(()=>{});throw e;}
}
