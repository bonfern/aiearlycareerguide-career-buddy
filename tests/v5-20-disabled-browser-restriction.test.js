import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browserClaimFromSnapshot,browserAccess} from '../api/_lib/free-browser.js';

const service = fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');

test('default disabled browser restriction safely handles an absent claim snapshot',()=>{
  assert.equal(browserClaimFromSnapshot(null),null);
  assert.equal(browserClaimFromSnapshot(undefined),null);
  assert.equal(browserClaimFromSnapshot({data:()=>undefined}),null);
  assert.equal(browserAccess(browserClaimFromSnapshot(null),'session-A'),true);
});

test('enabled browser restriction keeps ownership checks working',()=>{
  const own={data:()=>({ownerId:'session-A'})};
  assert.equal(browserAccess(browserClaimFromSnapshot(own),'session-A'),true);
  assert.equal(browserAccess(browserClaimFromSnapshot(own),'session-B'),false);
});

test('free-answer and free-report routes both read optional browser claims safely',()=>{
  const guard='assertFreeBrowser(browserClaimFromSnapshot(bSnap),';
  assert.equal(service.split(guard).length-1,2,'both quick and freeReport must safely use optional browser claims');
  assert.doesNotMatch(service,/bSnap\.data\(\)/);
  assert.match(service,/const enforceBrowserLimit=\(\)=>process\.env\.ENFORCE_FREE_BROWSER_LIMIT==='1'/);
});
