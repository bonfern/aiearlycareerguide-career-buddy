import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildSnapshotV2,isSnapshotV2,validPersonalInsights,FREE_SNAPSHOT_VERSION,personalisedSnapshotPrompt} from '../api/_lib/free-snapshot-content.js';
import {buildFreeSnapshotPdf} from '../api/_lib/free-snapshot-pdf.js';

const guidance={targetCompetencies:Array.from({length:4},(_,i)=>({title:`Role skill ${i+1}`,bullets:[`Apply this skill during realistic work tasks at the relevant career stage ${i+1}.`,`Produce an example that demonstrates the capability in a practical setting ${i+1}.`]})),nextSteps:Array.from({length:5},(_,i)=>({title:`Practice item ${i+1}`,bullets:[`Create a small task that uses this role-related capability, step ${i+1}.`,`Document what you tried and what a real-world output would look like ${i+1}.`]}))};
const profile={freeIntakeVersion:21,careerStage:'Mid-Career Professional (4-10 years)',targetGoalRole:'Data Analyst',targetRole:'Data Analyst',interestFields:[],personalStrengths:['Solving problems','Analysing data and information'],careerPriorities:['Change to a different role','Build future-ready skills'],careerBarriers:['Limited time for learning'],learningTime:'1-3 hours',educationLevel:"Bachelor's Degree",existingSkills:'Built a dashboard for an operational improvement project',roleExperience:['Power BI dashboard']};
const goodInsights={transferableAdvantage:'Your operational improvement experience combined with the dashboards you built may provide a starting point for business-focused analytics roles.',careerOpportunities:['Data Analyst — your operational dashboard experience could help you interpret real business problems using data.','Operations Analyst — your process background could support investigations into service performance and recurring delays.','Business Intelligence Analyst — your reporting experience may help you turn business questions into useful dashboards.'],nextBestMoves:['Compare three data analyst roles and record the two most common analytical tasks appearing in their descriptions.','Use a small open dataset to document one business question and create a one-page exploratory dashboard.','Schedule a discussion with a data analyst and note the technical capability they say matters most on the job.']};
test('new free-report shape requires 3 grounded pathways and 3 immediate actions',()=>{
 assert.equal(FREE_SNAPSHOT_VERSION,6);
 assert.ok(validPersonalInsights(goodInsights));
 const r=buildSnapshotV2(profile,guidance,goodInsights);
 assert.ok(isSnapshotV2(r));
 assert.equal(r.reportEdition,'focused-free-discovery');
 assert.deepEqual(r.careerOpportunities,goodInsights.careerOpportunities);
 assert.deepEqual(r.nextBestMoves,goodInsights.nextBestMoves);
 assert.equal(r.reportedStrengths.length,2);
 for(const key of ['careerOpportunities','nextBestMoves'])assert.equal(r[key].length,3);
 assert.ok(!('careerAlignment' in r));
 assert.ok(!validPersonalInsights({...goodInsights,nextBestMoves:goodInsights.nextBestMoves.slice(0,2)}));
 assert.ok(!validPersonalInsights({...goodInsights,careerOpportunities:goodInsights.careerOpportunities.slice(0,2)}));
});
test('new PDF is within three pages and does not expose long or paid sections',()=>{
 const snapshot=buildSnapshotV2(profile,guidance,goodInsights);
 const pdf=buildFreeSnapshotPdf(snapshot).toString('latin1');
 const pages=Number(pdf.match(/\/Count (\d+)/)?.[1]);
 assert.ok(pages>=1&&pages<=3,`expected at most three pages, got ${pages}`);
 for(const part of ['Your career profile','Your transferable advantage','Three career pathways to explore','Your three immediate next moves','What a Premium Assessment evaluates'])assert.match(pdf,new RegExp(part));
 for(const fragment of ['Your career alignment','30 / 60 / 90-day execution plan','Skills important for your target role','Your resume review','Recommended certifications','Interview question bank'])assert.doesNotMatch(pdf,new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.ok(pdf.indexOf('What a Premium Assessment evaluates')>pdf.indexOf('Your three immediate next moves'));
});
test('long but valid AI fields still produce three pages maximum',()=>{
 const long={...goodInsights,transferableAdvantage:'You reported practical relevant achievements and transferable interests across multiple work settings. '.repeat(2).slice(0,250),careerOpportunities:goodInsights.careerOpportunities.map(x=>x.padEnd(190,' with relevant exposure')),nextBestMoves:goodInsights.nextBestMoves.map(x=>x.padEnd(170,' with specific follow-up'))};
 assert.ok(validPersonalInsights(long));
 const snapshot=buildSnapshotV2({...profile,existingSkills:'A dashboard example using a self-reported tool. '.repeat(3)},guidance,long);
 const pdf=buildFreeSnapshotPdf(snapshot).toString('latin1');
 assert.ok(Number(pdf.match(/\/Count (\d+)/)?.[1])<=3);
});
test('free and Premium remain separate in UI and model instructions',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const service=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 assert.match(app,/if\(r.version>=6\)\{renderFocusedFreeSnapshot\(view,r\)/);
 assert.match(app,/if\(r.version>=6\)\{renderFocusedFreeSnapshot\(host,r\)/);
 assert.match(app,/function openDetailed\(/);
 assert.match(app,/What a Premium Assessment evaluates/);
 assert.doesNotMatch(personalisedSnapshotPrompt,/"careerAlignment"/);
 assert.match(personalisedSnapshotPrompt,/EXACTLY THREE/);
 assert.match(service,/personalisedSnapshotPrompt/);
 assert.match(service,/free-personal-insight/);
 assert.match(service,/version:'5\.22'/);
});
