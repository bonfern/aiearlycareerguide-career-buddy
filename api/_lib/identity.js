import crypto from 'node:crypto';
const TTL=10*60*1000;
export function normalizeEmail(email){const e=String(email||'').trim().toLowerCase();if(e.length>254||!/^[^\s@]{1,64}@[^\s@]+\.[a-z]{2,}$/i.test(e))throw Error('Enter a valid email address.');return e;}
export function emailKey(email){return crypto.createHash('sha256').update(normalizeEmail(email)).digest('hex');}
export function newOtp(){return String(crypto.randomInt(0,1000000)).padStart(6,'0');}
export function challengeHash(email,code,nonce,secret){if(!secret||secret.length<24)throw Error('OTP secret must be configured.');return crypto.createHmac('sha256',secret).update(`${normalizeEmail(email)}|${code}|${nonce}`).digest('hex');}
export function constantEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
export function otpValid(challenge,{email,code,secret,time=Date.now()}){if(!challenge||challenge.expiresAt<time||challenge.attempts>=5)return false;if(!/^\d{6}$/.test(String(code||'')))return false;return constantEqual(challenge.codeHash,challengeHash(email,code,challenge.nonce,secret));}
export function verifyCookie(value,secret){const [id,mac]=String(value||'').split('.');if(!/^[a-f0-9]{64}$/.test(id)||!secret)return null;const expected=crypto.createHmac('sha256',secret).update(id).digest('hex');return constantEqual(expected,mac)?id:null;}
export function signCookie(id,secret){if(!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid id');return `${id}.${crypto.createHmac('sha256',secret).update(id).digest('hex')}`;}
export {TTL};
