import {validateCapturedPayment} from './razorpay-test.js';
import {couponCounterRef,couponUserRef} from './firestore-coupons.js';
/** Shared idempotent fulfilment for verified checkout and signed live webhooks. */
export async function grantCapturedLivePayment(store,order,confirmed){
 const ref=store.collection('buddyLivePayments').doc(order.orderId);
 return store.runTransaction(async tx=>{
  const paymentSnap=await tx.get(ref),stored=paymentSnap.data();
  if(!stored||stored.sessionId!==order.sessionId)throw Error('Payment record does not match this account.');
  const sessionRef=store.collection('buddyLiveEmailSessions').doc(stored.sessionId),sessionSnap=await tx.get(sessionRef),s=sessionSnap.data();
  if(!s)throw Error('Customer record unavailable.');
  if(stored.granted)return s;
  // Consume a managed percentage coupon exactly once on successful capture.
  // The original payment is always fulfilled even if its abandoned checkout
  // released a reservation and the charge later arrives via webhook.
  let counterRef=null,userRef=null,counter={},user={};
  if(stored.couponSource==='firestore'&&stored.coupon){
   counterRef=couponCounterRef(store,stored.coupon);userRef=couponUserRef(store,stored.sessionId);
   const counterSnap=await tx.get(counterRef),userSnap=await tx.get(userRef);
   counter=counterSnap.data()||{};user=userSnap.data()||{};
  }
  if(!validateCapturedPayment(confirmed,stored))throw Error('Razorpay has not confirmed a matching captured payment.');
  if((s.credits||0)+stored.credits>1000)throw Error('Credit safety limit reached. Contact support.');
  const t=Date.now(),newTier=s.tier==='paid'?'paid':stored.packId==='starter'?'paid':stored.packId==='intro'?'coach':s.tier;
  const expiry=Math.max(t,(['paid','coach'].includes(s.tier)?Number(s.expiresAt)||0:0))+stored.days*86400000;
  const record={id:stored.orderId,packId:stored.packId,credits:stored.credits,priceInr:stored.priceInr,discountPercent:stored.discountPercent,at:t,kind:'razorpay-live',paymentId:confirmed.id};
  const result={...s,tier:newTier,paidStartedAt:s.paidStartedAt||t,credits:(s.credits||0)+stored.credits,creditsGranted:(s.creditsGranted||0)+stored.credits,expiresAt:expiry,
   pendingLiveCheckout:s.pendingLiveCheckout?.orderId===stored.orderId?null:s.pendingLiveCheckout,
   unsettledLiveCheckoutIds:(s.unsettledLiveCheckoutIds||[]).filter(id=>id!==stored.orderId),
   previewOrders:[...(s.previewOrders||[]),record].slice(-30)};
  if(counterRef){
   tx.set(counterRef,{...counter,count:(counter.count||0)+1,pending:Math.max(0,(counter.pending||0)-(stored.couponReserved?1:0)),updatedAt:t});
   tx.set(userRef,{...user,pending:(user.pending||[]).filter(x=>x.orderId!==stored.orderId),redemptions:[...(user.redemptions||[]),{code:stored.coupon,packId:stored.packId,orderId:stored.orderId,at:t}]});
  }
  tx.update(ref,{granted:true,status:'captured',couponReserved:false,paymentId:confirmed.id,grantedAt:t});
  tx.update(sessionRef,{tier:result.tier,paidStartedAt:result.paidStartedAt,credits:result.credits,creditsGranted:result.creditsGranted,expiresAt:result.expiresAt,pendingLiveCheckout:result.pendingLiveCheckout,unsettledLiveCheckoutIds:result.unsettledLiveCheckoutIds,previewOrders:result.previewOrders});
  return result;
 });
}
