import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import {createAssessmentBank,normalizeSkillMap,validBank,AssessmentPreparationError} from '../api/_lib/competency-assessment.js';
import {assertTestKeys,testPaymentEnabled,testPaymentSignature,validateCapturedPayment,offerAmountPaise,razorpayTestAPI} from '../api/_lib/razorpay-test.js';

const skills=[
 {id:'s1',name:'Data analysis',type:'technical',benchmark:'Can interpret process data and prioritise actions based on trends.',subskills:['trend analysis','risk measurement']},
 {id:'s2',name:'Service operations',type:'technical',benchmark:'Can diagnose problems and manage sustained service improvements.',subskills:['service capacity','process controls']},
 {id:'s3',name:'Senior stakeholder influence',type:'behavioural',benchmark:'Can present options and win agreement with competing stakeholders.',subskills:['stakeholder alignment','conflict resolution']},
 {id:'s4',name:'People leadership',type:'behavioural',benchmark:'Can coach teams, resolve difficult decisions and maintain accountability.',subskills:['coaching others','team prioritisation']}
];
const other=[{name:'Commercial awareness',expectation:'Understands business costs, opportunities and return on investments.'}];
function questionsFor(groups){return groups.flatMap(s=>Array.from({length:3},(_,i)=>({
 competencyId:s.id,questionKind:s.type==='technical'&&i===0?'knowledge':'scenario',difficulty:i===1?'advanced':'applied',
 text:`${s.name}: A service team faces issue ${i+1} and needs to balance cost, stakeholder needs and quality. What should the leader do next?`,
 options:['Compare alternatives using reliable evidence and a decision framework','Convene the team to examine current delivery constraints','Try a short pilot and measure the main risks first','Check with stakeholders before changing their agreed targets','Not sure'],
 answerKey:0,rationale:'Select the approach that best balances evidence, risk and practical priorities.',subskill:s.subskills[i%2]
})));}
test('skill-map normalization fixes competency 3 when AI uses behavioral and wrong id',()=>{
 const parsed={competencies:skills.map((c,i)=>i===2?{...c,id:'competency-three',type:'behavioral'}:c),untestedSkills:other};
 assert.equal(normalizeSkillMap(parsed).competencies[2].type,'behavioural');
 assert.equal(normalizeSkillMap(parsed).competencies[2].id,'s3');
});
test('map and question batch retries preserve 3 questions for every one of 4 skills',async()=>{
 let c=0;const logs=[];
 const ai=async msg=>{c++;
   const roleMap={competencies:skills.map((x,i)=>i===2?{...x,id:'competency-three',type:'behavioral'}:x),untestedSkills:other};
   const result=c===1?{competencies:skills.slice(0,2),untestedSkills:other}:c===2?roleMap:
    c===3?{questions:[]}:
    c===4?{questions:questionsFor(skills.slice(0,2))}:{questions:questionsFor(skills.slice(2))};
   logs.push(JSON.stringify(msg));return {result,model:'test',usage:{prompt_tokens:100,completion_tokens:500}};
 };
 const r=await createAssessmentBank('Director of Operations',ai);
 assert.equal(c,5);assert.equal(r.usages.length,5);assert.equal(r.attempts.length,2);assert.equal(r.bank.questions.length,12);assert.ok(validBank(r.bank));
 assert.ok(r.bank.competencies.filter(x=>x.type==='behavioural').length>=2);
});
test('after three invalid responses, error has provider billing usage and no invalid bank',async()=>{
 let calls=0;
 await assert.rejects(createAssessmentBank('Director of Operations',async()=>{calls++;return {result:{competencies:[skills[0]]},model:'test',usage:{prompt_tokens:90,completion_tokens:60}};}),e=>{
  assert.ok(e instanceof AssessmentPreparationError);assert.equal(e.usages.length,3);assert.equal(e.attempts.length,3);return true;
 });
 assert.equal(calls,3);
});
test('checkout refuses live-mode keys, and payments require captured status and correct INR amount',()=>{
 assert.throws(()=>assertTestKeys({RAZORPAY_TEST_KEY_ID:'rzp_live_bad',RAZORPAY_TEST_KEY_SECRET:'123456789'}),/TEST/);
 assert.equal(testPaymentEnabled({PAYMENT_FLOW_MODE:'razorpay_test',RAZORPAY_TEST_KEY_ID:'rzp_test_abcdefghi',RAZORPAY_TEST_KEY_SECRET:'123456789'}),true);
 assert.equal(testPaymentEnabled({PAYMENT_FLOW_MODE:'simulated'}),false);
 assert.equal(offerAmountPaise({priceInr:499}),49900);
 assert.throws(()=>offerAmountPaise({priceInr:0}),/discount/);
 const order={orderId:'order_ABCDEFGHIJKL',amountPaise:49900};
 assert.equal(validateCapturedPayment({id:'pay_abcdefghi12',order_id:order.orderId,status:'captured',captured:true,currency:'INR',amount:49900},order),true);
 assert.equal(validateCapturedPayment({id:'pay_abcdefghi12',order_id:order.orderId,status:'authorized',captured:false,currency:'INR',amount:49900},order),false);
 assert.equal(validateCapturedPayment({id:'pay_abcdefghi12',order_id:order.orderId,status:'captured',captured:true,currency:'INR',amount:14900},order),false);
});
test('Razorpay HMAC verifies valid checkout callback, rejects forged payment id',()=>{
 const secret='a fake sandbox secret';const orderId='order_ABCDEFGHIJKL',paymentId='pay_abcdefghijk';
 const digest=crypto.createHmac('sha256',secret).update(orderId+'|'+paymentId).digest('hex');
 assert.equal(testPaymentSignature(orderId,paymentId,digest,secret),true);
 assert.equal(testPaymentSignature(orderId,'pay_abcdefghijl',digest,secret),false);
 assert.equal(testPaymentSignature(orderId,paymentId,'a'.repeat(64),secret),false);
});
test('Razorpay API is called only with TEST credentials; no network used in this test',async()=>{
 const fake=async(url,options)=>({ok:true,json:async()=>({id:'order_ABCDEF12345',amount:49900,currency:'INR'})});
 const out=await razorpayTestAPI('POST','/v1/orders',{amount:49900,currency:'INR'}, {RAZORPAY_TEST_KEY_ID:'rzp_test_abcdefghi',RAZORPAY_TEST_KEY_SECRET:'123456789'},fake);
 assert.equal(out.amount,49900);
 await assert.rejects(razorpayTestAPI('POST','/v1/evil',{}, {RAZORPAY_TEST_KEY_ID:'rzp_test_abcdefghi',RAZORPAY_TEST_KEY_SECRET:'123456789'},fake),/Unsupported/);
});
test('test checkout actions are gated and simulated activation is disabled when test mode selected',()=>{
 const source=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 for(const path of ['testCheckout','testPaymentVerify','testPaymentStatus'])assert.match(source,new RegExp(`action==='${path}'`));
 assert.match(source,/Simulated purchase is disabled while Razorpay Test Mode is selected/);
 assert.match(source,/if\(stored\.granted\)return safeState\(s\)/);
 assert.match(source,/validateCapturedPayment\(confirmed,stored\)/);
 assert.match(source,/tx\.update\(orderRef,\{granted:true/);
});
