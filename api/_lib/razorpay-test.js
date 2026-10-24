/* Razorpay TEST MODE ONLY. Never accept a live key in this private preview build. */
import crypto from 'node:crypto';
export function assertTestKeys(env=process.env){
 const id=String(env.RAZORPAY_TEST_KEY_ID||'').trim();
 const secret=String(env.RAZORPAY_TEST_KEY_SECRET||'');
 if(!/^rzp_test_[A-Za-z0-9]+$/.test(id)||secret.length<8)throw Error('Configure Razorpay TEST MODE keys only.');
 return {id,secret};
}
export function testPaymentEnabled(env=process.env){
 if(env.PAYMENT_FLOW_MODE!=='razorpay_test')return false;
 try{assertTestKeys(env);return true;}catch{return false;}
}
export function testPaymentSignature(orderId,paymentId,signature,secret){
 if(!/^order_[A-Za-z0-9]+$/.test(String(orderId))||!/^pay_[A-Za-z0-9]+$/.test(String(paymentId))||!(/^[a-f0-9]{64}$/i.test(String(signature))))return false;
 const expected=crypto.createHmac('sha256',secret).update(orderId+'|'+paymentId).digest('hex');
 const a=Buffer.from(expected,'hex'),b=Buffer.from(signature,'hex');
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export function validateCapturedPayment(payment,order){
 return Boolean(payment&&order&&payment.order_id===order.orderId&&payment.status==='captured'&&payment.captured===true&&payment.currency==='INR'&&Number(payment.amount)===Number(order.amountPaise)&&payment.id&&(/^pay_[A-Za-z0-9]+$/.test(payment.id)));
}
export function offerAmountPaise(offer){
 if(!offer||!Number.isInteger(offer.priceInr)||offer.priceInr<1)throw Error('This discount cannot be processed through test checkout. Use a coupon below 100%.');
 return offer.priceInr*100;
}
export async function razorpayTestAPI(method,path,data,env=process.env,fetcher=fetch){
 const {id,secret}=assertTestKeys(env);
 if(!/^\/v1\/(orders|payments)(?:\/[a-zA-Z0-9_/-]+)?$/.test(path))throw Error('Unsupported payment API path.');
 const reply=await fetcher('https://api.razorpay.com'+path,{
  method,
  headers:{Authorization:'Basic '+Buffer.from(`${id}:${secret}`).toString('base64'),'Content-Type':'application/json'},
  ...(data?{body:JSON.stringify(data)}:{}),
  signal:AbortSignal.timeout(18000)
 });
 let out={};try{out=await reply.json();}catch{}
 if(!reply.ok)throw Error('Razorpay test gateway unavailable. Check the test dashboard or try again.');
 return out;
}
