import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isFeedbackAdmin,parseFeedback,feedbackId,canRateFeedback,publicFeedback} from '../api/_lib/feedback.js';
import {buildFreeSnapshotPdf} from '../api/_lib/free-snapshot-pdf.js';
test('administrator rights require exact allowlisted verified email',()=>{
 assert.equal(isFeedbackAdmin('owner@example.com','owner@example.com, second@example.com'),true);
 assert.equal(isFeedbackAdmin('someowner@example.com','owner@example.com'),false);
 assert.equal(isFeedbackAdmin('owner@example.com',''),false);
});
test('feedback requires a valid stage, rating, category and bounded comment',()=>{
 assert.deepEqual(parseFeedback({stage:'free',rating:5,category:'depth',comment:'  Useful  '}),{stage:'free',rating:5,category:'depth',comment:'Useful',anchor:'free'});
 for(const body of [{stage:'free',rating:0,category:'depth'}, {stage:'other',rating:5,category:'depth'}, {stage:'premium',rating:5,category:'unknown'},{stage:'chat',rating:4,category:'content',anchor:'x'},{stage:'free',rating:5,category:'depth',comment:'x'.repeat(1001)}])assert.throws(()=>parseFeedback(body));
 assert.equal(parseFeedback({stage:'chat',anchor:'1793538888999',rating:1,category:'technical'}).stage,'chat');
});
test('feedback is scoped to actual completion and conversation answer',()=>{
 const s={freeReport:{version:6},report:null,messages:[{role:'user',at:1793538888999},{role:'assistant',at:1793538889999}]};
 assert.equal(canRateFeedback(s,'free','free'),true);
 assert.equal(canRateFeedback(s,'premium','premium'),false);
 assert.equal(canRateFeedback(s,'chat','1793538888999'),false);
 assert.equal(canRateFeedback(s,'chat','1793538889999'),true);
 assert.equal(feedbackId('id','free','free'),feedbackId('id','free','free'));
 assert.notEqual(feedbackId('id','free','free'),feedbackId('other','free','free'));
});
test('public feedback excludes account identifiers',()=>{
 const x=publicFeedback({id:'abc',stage:'free',rating:4,category:'content',comment:'Thanks',createdAt:1,email:'secret@example.com',sessionId:'private'});
 assert.equal(x.email,undefined);assert.equal(x.sessionId,undefined);
});
test('free PDF embeds official logo and both bullet statements',()=>{
 const snapshot={version:6,profileSummary:'Illustrative career interest in operations leadership.',transferableAdvantage:'Build on known communication strengths.',targetCompetencies:[{title:'Change leadership',bullets:['Communicate clearly with the project team.','Track whether new practices are adopted by colleagues.']}],careerOpportunities:['Operations Manager - this is an illustrative direction. Explore typical tasks.'],nextBestMoves:['Compare two example job descriptions.']};
 const pdf=buildFreeSnapshotPdf(snapshot);
 assert.equal(pdf.subarray(0,8).toString(),'%PDF-1.4');
 assert(pdf.includes(Buffer.from('/Subtype /Image')));
 assert(pdf.includes(Buffer.from('Track whether new practices')));
 assert(pdf.includes(Buffer.from('Want to know more?')));
 fs.writeFileSync('/mnt/data/v528-free-snapshot-check.pdf',pdf);
});
test('sample premium report exists and contains fictional-sample identifier',()=>{
 const pdf=fs.readFileSync(new URL('../sample-premium-report.pdf',import.meta.url));
 assert(pdf.includes(Buffer.from('ILLUSTRATIVE SAMPLE')));assert(pdf.includes(Buffer.from('/Subtype /Image')));
});
