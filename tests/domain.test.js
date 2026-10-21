import test from 'node:test';
import assert from 'node:assert/strict';
import {MESSAGE_LIMIT,validateMessage,reportReadiness,mergeProfile,creditWarning,estimateUsage,PACKS} from '../api/_lib/domain.js';
test('character limit and controls are enforced',()=>{
 assert.equal(validateMessage('  Career switch  '),'Career switch');
 assert.throws(()=>validateMessage('a'.repeat(MESSAGE_LIMIT+1)),/1200/);
 assert.throws(()=>validateMessage(''),/enter a message/);
 assert.throws(()=>validateMessage('hello\u0000'),/control characters/);
});
test('report remains locked without enough structured evidence',()=>{
 const p=mergeProfile({}, {employmentStatus:'Employed',currentRole:'Analyst',experience:'4 years',goal:'Lead projects',targetRole:'Project Manager',timeframe:'12 months',responsibilities:['I coordinate two teams'],skills:['Stakeholder management','Excel'],gaps:['Risk planning'],constraints:'5 hours each week'});
 assert.equal(reportReadiness(p).ready,false);
 const complete=mergeProfile(p,{achievements:['Delivered a cross-team reporting project two weeks ahead of schedule','Introduced a weekly control process reducing manual errors by twenty percent']});
 assert.equal(reportReadiness(complete).ready,true);
});
test('profile merges without duplicating skill entries',()=>{
 const a=mergeProfile({}, {skills:['Planning','Communication']});
 assert.deepEqual(mergeProfile(a,{skills:['planning','Risk management']}).skills,['Planning','Communication','Risk management']);
});
test('warnings are available at every important threshold',()=>{
 assert.match(creditWarning(10),/10/);assert.match(creditWarning(5),/5/);
 assert.match(creditWarning(1),/1/);assert.match(creditWarning(0),/exhausted/);
});
test('unknown token prices do not invent cost estimates',()=>{
 assert.equal(estimateUsage({prompt_tokens:2000,completion_tokens:500},{}).inrCost,null);
 assert.ok(Math.abs(estimateUsage({prompt_tokens:2000,completion_tokens:500},{OPENAI_INPUT_USD_PER_MILLION:'1',OPENAI_OUTPUT_USD_PER_MILLION:'5',OPENAI_USD_INR:'90'}).inrCost-0.405)<1e-10);
});
test('indicative packs include separate coaching introductory option',()=>assert.deepEqual(Object.keys(PACKS),['intro','starter','standard','extended']));
