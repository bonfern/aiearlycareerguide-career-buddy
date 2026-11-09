import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const service=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('first-time visitor state is an unauthenticated empty state, not an API error',()=>{
 const start=service.indexOf('async function ownerState');
 const end=service.indexOf('async function setJourney',start);
 assert.ok(start>=0&&end>start,'ownerState handler exists');
 const handler=service.slice(start,end);
 assert.match(handler,/const verifiedId=cookieId\(req,COOKIE\),guestId=cookieId\(req,GUEST_COOKIE\)/);
 assert.match(handler,/if\(!verifiedId&&!guestId\)/);
 assert.match(handler,/return out\(res,200,\{state:null,authenticated:false\}\)/);
 assert.ok(handler.indexOf('return out(res,200,{state:null,authenticated:false})')<handler.indexOf('await getSession(req)'),
  'no-cookie branch must return before getSession can throw 401');
});

test('invalid stale identity cookies are cleared without displaying an authentication failure',()=>{
 const start=service.indexOf('async function ownerState');
 const end=service.indexOf('async function setJourney',start);
 const handler=service.slice(start,end);
 assert.match(handler,/if\(readCookie\(req,COOKIE\)\|\|readCookie\(req,GUEST_COOKIE\)\)/);
 assert.match(handler,/setIdentityCookie\(req,res,COOKIE,null,0\)/);
 assert.match(handler,/setIdentityCookie\(req,res,GUEST_COOKIE,null,0\)/);
});

test('landing initialization does not retry the same failed state request',()=>{
 assert.doesNotMatch(app,/catch\(e\)\{notice\(e\.message,true\);try\{state=\(await api\('state'\)\)\.state;\}catch\{\}\}/);
 assert.match(app,/else state=\(await api\('state'\)\)\.state/);
});

test('landing API cache-bust version matches the anonymous-state hotfix',()=>{
 assert.match(html,/style\.css\?v=5\.32\.2/);
 assert.match(html,/app\.js\?v=5\.32\.2/);
});
