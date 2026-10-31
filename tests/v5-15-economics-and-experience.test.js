import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PACKS,estimateUsage} from '../api/_lib/domain.js';
import {PROFESSIONAL_SECTIONS} from '../api/_lib/report-v4.js';
import {SKILL_MAP_PROMPT,BANK_PROMPT,professionalOptionIssue,ASSESSMENT_BANK_VERSION} from '../api/_lib/competency-assessment.js';
import {buildResumeReviewPdf} from '../api/_lib/resume-review-pdf.js';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const service=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');

test('new purchase credit allowance retains price and separates assessment from coaching',()=>{
 assert.deepEqual([PACKS.starter.priceInr,PACKS.starter.credits],[499,40]);
 assert.deepEqual([PACKS.intro.priceInr,PACKS.intro.credits],[149,12]);
 assert.deepEqual([PACKS.standard.priceInr,PACKS.standard.credits],[249,30]);
 assert.deepEqual([PACKS.extended.priceInr,PACKS.extended.credits],[399,60]);
 assert.doesNotMatch(app,/No credit deducted for assessment answers/);
});
test('OpenAI Astra paid assessment, professional-grade distractors, graded scenarios',()=>{
 assert.match(service,/ASSESSMENT_MODEL\|\|'gpt-6-astra'/);
 assert.match(service,/REPORT_MODEL\|\|'gpt-6.1-sol'/);
 assert.match(service,/ASSESSMENT_REASONING_EFFORT\|\|'high'/);
 assert.match(BANK_PROMPT,/EXACTLY THREE questions per provided competency/);
 assert.match(SKILL_MAP_PROMPT,/TWO technical and TWO behavioural/);
 assert.equal(ASSESSMENT_BANK_VERSION,2);
 assert.ok(professionalOptionIssue({options:['Always ignore the customer','Test a hypothesis','Find a compromise','Collect more data']}));
});
test('per-model actual token calculation for budget visibility',()=>{
 const result=estimateUsage({prompt_tokens:20000,completion_tokens:15000},{OPENAI_USD_INR:'90'},'gpt-6-astra');
 assert.ok(Math.abs(result.usdCost-0.95)<0.00001);
 assert.ok(Math.abs(result.inrCost-85.5)<0.00001);
});
test('the paid report has no resume section, resume review is its own five-credit action',()=>{
 assert.ok(!PROFESSIONAL_SECTIONS.some(s=>/resume|cv/i.test(s)));
 assert.match(service,/const RESUME_REVIEW_COST=5/);
 assert.match(service,/kind!=='resume-review'/);
 assert.match(html,/id="resumeReviewPanel"/);
 assert.match(html,/maxlength="16000"/);
 assert.doesNotMatch(html,/id="screenResume"/);
 assert.match(app,/downloadResumeReview/);
});
test('resume review generates a self-contained branded PDF',()=>{
 const pdf=buildResumeReviewPdf({headline:'Resume improvements',strengths:['Delivery expertise'],missingDetails:['Evidence of outcome'],corrections:['Quantify results'],exampleImprovement:'Delivered project results',nextActions:['Get evidence']},'Director');
 assert.ok(pdf.subarray(0,8).toString('latin1').startsWith('%PDF-1.4'));
 assert.ok(pdf.length>2000);
 assert.ok(pdf.toString('latin1').includes('Resume Review and Improvement Priorities'));
});
test('UI offers calm CTA, processing and persistent resume review action with clean paid wording',()=>{
 assert.match(css,/.snapshot-cta\{background:#e0f1ee;color:#174c55;font-weight:500/);
 assert.match(html,/id="processingOverlay"/);
 assert.match(app,/Loading your saved career journey/);
 assert.match(html,/id="resumeReviewOpen"/);
 assert.match(html,/id="coachGuide"/);
 assert.match(html,/Review my resume · 5 credits/);
 assert.doesNotMatch(html,/guaranteed interview questions|paid checkout charges real money/i);
 assert.match(html,/>Proceed</);
});
