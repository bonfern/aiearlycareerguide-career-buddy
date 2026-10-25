// Optional LIVE payment event recovery. Must be reachable by Razorpay (deployment
// protection can block inbound webhooks); signed payload and provider verification
// are required before idempotent fulfilment. Zero-price coupons do not use this.
import {getApps,initializeApp,cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {paymentMode,validWebhookSignature,requireLiveSettings,razorpayLiveAPI} from './_lib/razorpay-live.js';
import {grantCapturedLivePayment} from './_lib/live-grants.js';
import {validateCapturedPayment} from './_lib/razorpay-test.js';
export const config={api:{bodyParser:false}};
let database;
function db(){
 if(database)return database;
 const data=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||'{}');
 const app=getApps().find(x=>x.name==='career-buddy-live-webhook')||initializeApp({credential:cert(data)},'career-buddy-live-webhook');
 database=getFirestore(app);return database;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 if(paymentMode()!=='razorpay_live'||process.env.LIVE_PAID_CHECKOUT_ENABLED!=='1')return res.status(404).end();
 let raw=Buffer.alloc(0);
 try{
  requireLiveSettings();
  const secret=process.env.RAZORPAY_LIVE_WEBHOOK_SECRET;
  if(!secret||secret.length<16)return res.status(503).end();
  const parts=[];let total=0;
  for await(const part of req){total+=part.length;if(total>1024*1024)return res.status(413).end();parts.push(part);}
  raw=Buffer.concat(parts);
  if(!validWebhookSignature(raw,String(req.headers['x-razorpay-signature']||''),secret))return res.status(401).end();
  const event=JSON.parse(raw.toString('utf8'));
  if(!['payment.captured','order.paid'].includes(event.event))return res.status(200).json({received:true});
  let orderId,paymentId;
  if(event.event==='payment.captured'){paymentId=event.payload?.payment?.entity?.id;orderId=event.payload?.payment?.entity?.order_id;}
  else{orderId=event.payload?.order?.entity?.id;}
  if(!/^order_[A-Za-z0-9]+$/.test(orderId||''))return res.status(200).json({received:true});
  const store=db(),ref=store.collection('buddyLivePayments').doc(orderId),snap=await ref.get(),order=snap.data();
  if(!order||order.kind!=='razorpay-live')return res.status(200).json({received:true});
  let payment;
  if(paymentId){payment=await razorpayLiveAPI('GET',`/v1/payments/${paymentId}`);}
  else{const results=await razorpayLiveAPI('GET',`/v1/orders/${orderId}/payments`);payment=(results.items||[]).find(x=>validateCapturedPayment(x,order));}
  if(!validateCapturedPayment(payment,order))return res.status(200).json({received:true});
  await grantCapturedLivePayment(store,order,payment);
  return res.status(200).json({received:true});
 }catch(err){console.error('Career Buddy live webhook verification/fulfilment failed:',err?.name||'Error');return res.status(500).json({error:'Webhook processing failed'});}
}
