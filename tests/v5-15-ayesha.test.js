import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PACKS,estimateUsage} from '../api/_lib/domain.js';
import {bankIdentity,ASSESSMENT_BANK_VERSION,professionalOptionIssue,MIN_SKILLS,MAX_SKILLS,QUESTIONS_PER_SKILL} from '../api/_lib/competency-assessment.js';
import {buildResumeReviewPdf} from '../api/_lib/resume-review-pdf.js';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const server=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../style.css',import.meta.url),'utf8');
const report=fs.readFileSync(new URL('../api/_lib/report-v4.js',import.meta.url),'utf8');
const pdfReport=fs.readFileSync(new URL('../api/_lib/pdf-report.js',import.meta.url),'utf8');

test('new paid packs reserve sufficient room for assessment while price stays fixed',()=>{
 assert.deepEqual([PACKS.starter.priceInr,PACKS.starter.credits],[499,40]);
 assert.deepEqual([PACKS.intro.priceInr,PACKS.intro.credits,PACKS.intro.days],[149,12,14]);
 assert.deepEqual([PACKS.standard.priceInr,PACKS.standard.credits],[249,30]);
 assert.deepEqual([PACKS.extended.priceInr,PACKS.extended.credits],[399,60]);
 assert.match(server,/credits:Number\(s\.credits\|\|0\)\+stored\.credits/);
});

test('role-only bank cache is versioned; Astra reasoning and role evidence requirements preserved',()=>{
 assert.equal(ASSESSMENT_BANK_VERSION,2);
 assert.equal(bankIdentity('Director of Operations').key,bankIdentity('director   of operations').key);
 assert.equal(MIN_SKILLS,4);assert.equal(MAX_SKILLS,5);assert.equal(QUESTIONS_PER_SKILL,3);
 assert.match(server,/buddyCompetencyBanksV2/);
 assert.match(server,/ASSESSMENT_MODEL\|\|'gpt-6-astra'/);
 assert.match(server,/ASSESSMENT_REASONING_EFFORT\|\|'high'/);
 assert.ok(server.includes("REPORT_MODEL||'gpt-6.1-sol'"));
 assert.equal(professionalOptionIssue({options:['Compare available alternatives against project deadlines','Align stakeholders on measured priorities','Review current process constraints and risks','Run a controlled test with milestones']}),null);
 assert.match(professionalOptionIssue({options:['Conduct a comprehensive review to align different stakeholders with iterative benefit mechanisms','Check','Do nothing','Ask a question']}),/weak|longer/i);
});

test('assessment report does not require or deliver resume; review remains a coaching-only, charged tool',()=>{
 assert.doesNotMatch(html,/id="screenResume"/);
 assert.doesNotMatch(html,/id="resumeLater"/);
 assert.doesNotMatch(pdfReport,/Resume revision|Resume review and rewrite/);
 assert.match(report,/Do not evaluate resumes, rewrite resumes, or include a resume section/);
 assert.match(server,/const RESUME_REVIEW_COST=5/);
 assert.match(server,/if\(Number\(s\.credits\|\|0\)<RESUME_REVIEW_COST\)/);
 assert.match(server,/credits:s\.credits-RESUME_REVIEW_COST/);
 assert.match(server,/if\(s\.busy\?\.id!==key\)/);
 assert.match(html,/maxlength="16000"/);
 assert.match(html,/id="resumeReviewOpen"/);
 assert.match(app,/\[data-coach-prompt\]/);
 assert.ok(server.includes("kind!=='resume-review'"));
});

test('downloadable resume PDF excludes submitted source text and uses role-specific correction headings',()=>{
 const review={headline:'Substantial improvements are needed for a Head of Operations role',strengths:['Relevant transformation leadership'],missingDetails:['Quantified savings','Strategic impact'],corrections:['Add relevant achievement metrics','Specify ownership and team scope','Tailor profile to target role'],exampleImprovement:'Delivered a transformation initiative with [metric] benefit',nextActions:['Collect evidence','Revise two achievements']};
 const pdf=buildResumeReviewPdf(review,'Head of Operations');
 assert.equal(pdf.toString('latin1',0,8),'%PDF-1.4');assert.ok(pdf.length>4000);
 const plain=pdf.toString('latin1');
 assert.match(plain,/Resume Review and Improvement Priorities/);
 assert.match(plain,/Information and evidence to add/);
 assert.doesNotMatch(plain,/USER SOURCE RESUME TEXT/);
});

test('costs use actual model usage and can be converted with configured FX; no fabricated charge for answers',()=>{
 const astra=estimateUsage({prompt_tokens:6000,completion_tokens:14500},{OPENAI_USD_INR:'90'},'gpt-6-astra');
 assert.equal(astra.usdCost,0.785);
 assert.ok(Math.abs(astra.inrCost-70.65)<0.001);
 const unknown=estimateUsage({prompt_tokens:500},{},'another-model');
 assert.equal(unknown.usdCost,null);
 assert.match(server,/assessmentAnswer/);
 assert.doesNotMatch(html,/No credit deducted for assessment answers/);
});

test('calm visual CTA, Ayesha name, processing and clean question copy appear on public screens',()=>{
 assert.match(css,/\.choice-card \.snapshot-cta\{background:#e0f1ee;color:#174c55;font-weight:500/);
 assert.match(html,/AYESHA · YOUR CAREER BUDDY/);
 assert.match(html,/id="processingOverlay"/);
 assert.match(app,/Preparing questions: stage/);
 assert.doesNotMatch(html,/Career Buddy provides AI-generated career guidance based on supplied information, not verified competence scores/);
});
