import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {paymentMode,publicLiveMode,requireLiveSettings,canUseFullDiscount} from '../api/_lib/razorpay-live.js';
const prod={PAYMENT_FLOW_MODE:'razorpay_live',LIVE_PUBLIC_MODE:'1',LIVE_PRIVATE_MODE:'0',RAZORPAY_LIVE_KEY_ID:'rzp_live_abcdef123',RAZORPAY_LIVE_KEY_SECRET:'a-secret-key',PREVIEW_SESSION_SECRET:'abcdefghijklmnopqrstuvwxyz12345678'};
test('public live mode requires an explicit secure configuration',()=>{
 assert.equal(publicLiveMode(prod),true);
 assert.equal(requireLiveSettings(prod).id,prod.RAZORPAY_LIVE_KEY_ID);
 assert.throws(()=>requireLiveSettings({...prod,PREVIEW_SESSION_SECRET:'too-short'}),/session secret/);
 assert.throws(()=>requireLiveSettings({...prod,PAYMENT_FLOW_MODE:'razorpay_test'}),/razorpay_live/);
 assert.equal(paymentMode({VERCEL:'1'}),'unconfigured');
 assert.equal(paymentMode({...prod,VERCEL:'1'}),'razorpay_live');
});
test('owner 100 percent coupon remains per-email restricted in public mode',()=>{
 const env={...prod,LIVE_FREE_COUPON_CODE:'PRIV100',LIVE_FREE_COUPON_EMAILS:'verified@example.com'};
 assert.equal(canUseFullDiscount({env,email:'verified@example.com',code:'PRIV100'}),true);
 assert.equal(canUseFullDiscount({env,email:'stranger@example.com',code:'PRIV100'}),false);
});
test('frontend uses subpath API and relative assets, without a public preview passcode',()=>{
 const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const service=fs.readFileSync(new URL('../api/service.js',import.meta.url),'utf8');
 assert.match(app,/APP_BASE=.*professionals/);
 assert.match(app,/servicePath\(\)/);
 assert.match(html,/href="\.\/style\.css/);
 assert.match(html,/src="\.\/app\.js/);
 assert.match(service,/accessCodeRequired\(\)/);
 assert.match(service,/PUBLIC_SITE_ORIGIN/);
 assert.match(service,/buddyPublicLoginLimits/);
 assert.match(service,/publicLiveMode\(\) && \['mockPurchase'/);
});
