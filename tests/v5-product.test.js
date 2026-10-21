import test from 'node:test';
import assert from 'node:assert/strict';
import {PACKS,computeOffer,checkPackEligibility} from '../api/_lib/domain.js';
import {buildFreeSnapshotPdf} from '../api/_lib/free-snapshot-pdf.js';
import fs from 'node:fs';
import {validateDetailedReport} from '../api/_lib/report-v4.js';
test('direct coaching intro is a smaller, distinct indicative package',()=>{
 assert.deepEqual([PACKS.intro.priceInr,PACKS.intro.credits,PACKS.intro.days],[149,15,14]);
 assert.equal(computeOffer({packId:'intro',couponCode:'EARLY30',coupons:{EARLY30:30}}).priceInr,104);
});
test('introductory coaching never grants detailed assessment access',()=>{
 assert.equal(checkPackEligibility({tier:'free'},'intro'),'coach');
 assert.throws(()=>checkPackEligibility({tier:'coach'},'intro'),/introductory/);
 assert.throws(()=>checkPackEligibility({tier:'coach'},'starter'),/free snapshot/);
 assert.equal(checkPackEligibility({tier:'coach',freeReport:{profileSummary:'Saved'}},'starter'),'paid');
 assert.equal(checkPackEligibility({tier:'paid'},'standard'),'paid');
 assert.throws(()=>checkPackEligibility({tier:'free'},'extended'),/Start with/);
});
test('free PDF includes all four sections and supports long summaries',()=>{
 const snap={profileSummary:'Experienced operations leader. '.repeat(22),targetCompetencies:['Stakeholder management and persuasion'.repeat(2),'Planning','Technical analysis','Team leadership','Communication','Financial acumen'],nextSteps:Array(5).fill('Build evidence for your target role and seek relevant feedback from mentors'),furtherAssessment:Array(4).fill('Specific examples of leading business change')};
 const data=buildFreeSnapshotPdf(snap);assert.ok(Buffer.isBuffer(data));assert.ok(data.length>1200);assert.equal(data.toString('latin1',0,8),'%PDF-1.4');assert.match(data.toString('latin1'),/\/Count [12]/);
});
test('V5 interface exposes two independent routes and saved reports',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),js=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 for(const s of ['screenChoose','screenFree','screenSnapshot','screenPaid','screenResume','screenCoach','screenReports','snapshotDownload','resumeLater'])assert.ok(html.includes(`id="${s}"`),s);
 assert.match(js,/window\.scrollTo\(\{top:0/);
 assert.match(js,/download\('free'/);
});
