/* Live coupon definitions are managed in Firebase Admin Firestore, never by clients.
 * Collection: buddyLiveCoupons; document ID: uppercase coupon code.
 * No unauthenticated coupon administration API is exposed.
 */
import {computeOffer,PACKS} from './domain.js';
import {liveCoupons,canUseFullDiscount} from './razorpay-live.js';
const normal=v=>String(v||'').trim().toUpperCase();
const list=v=>Array.isArray(v)?v.map(x=>String(x||'').trim()):[];
const finiteMs=v=>typeof v==='number'&&Number.isFinite(v)?v:(v?.toMillis instanceof Function?v.toMillis():0);
export function parseFirestoreCoupon(code,doc,email,packId,at=Date.now()){
 if(!doc||doc.active!==true)throw Error('Coupon is not active.');
 const discountPercent=Number(doc.discountPercent);
 if(!Number.isInteger(discountPercent)||discountPercent<1||discountPercent>100)throw Error('Coupon configuration is invalid.');
 const startsAt=finiteMs(doc.startsAt),expiresAt=finiteMs(doc.expiresAt);
 if(startsAt&&at<startsAt)throw Error('Coupon is not active yet.');
 if(expiresAt&&at>=expiresAt)throw Error('Coupon has expired.');
 const allowedPacks=list(doc.allowedPacks);
 if(allowedPacks.length&&!allowedPacks.includes(packId))throw Error('Coupon does not apply to this package.');
 const allowedEmails=list(doc.allowedEmails).map(s=>s.toLowerCase());
 if(discountPercent===100&&!allowedEmails.length)throw Error('100% coupons require approved email addresses.');
 if(allowedEmails.length&&!allowedEmails.includes(String(email||'').trim().toLowerCase()))throw Error('Coupon is not available for this email.');
 const maxRedemptions=Number(doc.maxRedemptions);
 const maxPerEmail=Number(doc.maxPerEmail);
 if(!Number.isInteger(maxRedemptions)||maxRedemptions<1||maxRedemptions>10000||!Number.isInteger(maxPerEmail)||maxPerEmail<1||maxPerEmail>20)throw Error('Coupon must have valid redemption limits.');
 return {source:'firestore',code,discountPercent,maxRedemptions,maxPerEmail,allowedEmails,allowedPacks};
}
export async function resolveLiveCoupon(store,{packId,couponCode,email}){
 if(!Object.hasOwn(PACKS,packId))throw Error('Invalid pack.');
 const code=normal(couponCode);
 if(code&&!/^[A-Z0-9_-]{3,24}$/.test(code))throw Error('Invalid coupon format.');
 if(!code)return {offer:computeOffer({packId}),couponRule:null};
 const doc=await store.collection('buddyLiveCoupons').doc(code).get();
 if(doc.exists){
  const rule=parseFirestoreCoupon(code,doc.data(),email,packId);
  return {offer:computeOffer({packId,couponCode:code,coupons:{[code]:rule.discountPercent}}),couponRule:rule};
 }
 // Backward compatibility for already-configured Vercel coupons.
 const existing=liveCoupons(),offer=computeOffer({packId,couponCode:code,coupons:existing});
 if(offer.discountPercent===100&&!canUseFullDiscount({email,code}))throw Error('This complimentary code is not available for your account.');
 return {offer,couponRule:null};
}

export function couponCounterRef(store,code){
 const cryptoHash=(awaitlessHash(code));
 return store.collection('buddyLiveCouponCounters').doc(cryptoHash);
}
// Hashing preserves the legacy counter IDs while coupon codes remain manageable
// as readable document IDs in buddyLiveCoupons.
import crypto from 'node:crypto';
function awaitlessHash(code){return crypto.createHash('sha256').update(code).digest('hex').slice(0,32);}
export function couponUserRef(store,sessionId){return store.collection('buddyLiveCouponUsers').doc(sessionId);}
