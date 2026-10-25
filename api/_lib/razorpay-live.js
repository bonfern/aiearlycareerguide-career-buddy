// Private-live pilot: live credentials are accepted ONLY in razorpay_live mode.
// Free, owner-allowlisted coupons bypass the gateway (Razorpay does not take INR 0 orders).
import crypto from 'node:crypto';
import {testPaymentSignature,validateCapturedPayment,offerAmountPaise} from './razorpay-test.js';
export {validateCapturedPayment,offerAmountPaise};
export function paymentMode(env=process.env){return ['razorpay_live','razorpay_test'].includes(env.PAYMENT_FLOW_MODE)?env.PAYMENT_FLOW_MODE:(env.VERCEL==='1'||env.LIVE_PUBLIC_MODE==='1'?'unconfigured':'simulation');}
export function assertLiveKeys(env=process.env){
 const id=String(env.RAZORPAY_LIVE_KEY_ID||'').trim(),secret=String(env.RAZORPAY_LIVE_KEY_SECRET||'');
 if(!/^rzp_live_[A-Za-z0-9]+$/.test(id)||secret.length<8)throw Error('Configure valid Razorpay LIVE keys in Vercel (server-side).');
 return {id,secret};
}
export function liveConfigured(env=process.env){if(paymentMode(env)!=='razorpay_live')return false;try{assertLiveKeys(env);return true;}catch{return false;}}
export function allowedEmails(name,env=process.env){return new Set(String(env[name]||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean));}
export function approvedLiveTester(email,env=process.env){return allowedEmails('LIVE_TESTER_EMAILS',env).has(String(email||'').toLowerCase());}
export function publicLiveMode(env=process.env){return env.LIVE_PUBLIC_MODE==='1'&&env.LIVE_PRIVATE_MODE==='0';}
export function requireLiveSettings(env=process.env){
 if(paymentMode(env)!=='razorpay_live')throw Error('Set PAYMENT_FLOW_MODE=razorpay_live for live checkout.');
 if(publicLiveMode(env)){
  if(!env.PREVIEW_SESSION_SECRET||env.PREVIEW_SESSION_SECRET.length<32)throw Error('A strong session secret is required.');
  return assertLiveKeys(env);
 }
 if(env.LIVE_PRIVATE_MODE==='1'){
  if(!allowedEmails('LIVE_TESTER_EMAILS',env).size)throw Error('Set LIVE_TESTER_EMAILS to a non-empty list.');
  return assertLiveKeys(env);
 }
 throw Error('Set LIVE_PRIVATE_MODE=1 for the controlled pilot or LIVE_PRIVATE_MODE=0 with LIVE_PUBLIC_MODE=1.');
}
// Backward-compatible export for test suites; public and private modes are strictly checked above.
export const requirePrivateLiveSettings=requireLiveSettings;
export function liveCoupons(env=process.env){
 let base={};try{base=JSON.parse(env.LIVE_COUPONS_JSON||'{}');}catch{}
 const options=Object.fromEntries(Object.entries(base&&typeof base==='object'&&!Array.isArray(base)?base:{}).filter(([k,v])=>/^[A-Z0-9_-]{3,24}$/.test(k)&&Number.isInteger(v)&&v>0&&v<100));
 const code=String(env.LIVE_FREE_COUPON_CODE||'').trim().toUpperCase();if(/^[A-Z0-9_-]{3,24}$/.test(code))options[code]=100;
 return options;
}
export function canUseFullDiscount({email,code,env=process.env}){
 const configured=String(env.LIVE_FREE_COUPON_CODE||'').trim().toUpperCase();
 return Boolean(configured&&String(code||'').trim().toUpperCase()===configured&&(publicLiveMode(env)||approvedLiveTester(email,env))&&allowedEmails('LIVE_FREE_COUPON_EMAILS',env).has(String(email||'').toLowerCase()));
}
export function livePaymentSignature(orderId,paymentId,signature,env=process.env){return testPaymentSignature(orderId,paymentId,signature,assertLiveKeys(env).secret);}
export async function razorpayLiveAPI(method,path,data,env=process.env,fetcher=fetch){
 const {id,secret}=assertLiveKeys(env);
 if(!/^\/v1\/(orders|payments)(?:\/[a-zA-Z0-9_/-]+)?$/.test(path))throw Error('Unsupported payment API path.');
 const r=await fetcher('https://api.razorpay.com'+path,{method,headers:{Authorization:'Basic '+Buffer.from(`${id}:${secret}`).toString('base64'),'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(18000)});
 let dataOut={};try{dataOut=await r.json();}catch{}
 if(!r.ok)throw Error('Live gateway request failed. Check the Razorpay Dashboard; no credits were added.');
 return dataOut;
}
export function validWebhookSignature(raw,sig,secret){
 if(typeof sig!=='string'||!/^[a-f0-9]{64}$/i.test(sig))return false;
 const expected=crypto.createHmac('sha256',secret).update(raw).digest();
 return crypto.timingSafeEqual(expected,Buffer.from(sig,'hex'));
}
