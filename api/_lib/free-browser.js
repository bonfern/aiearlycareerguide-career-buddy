import crypto from 'node:crypto';
// A browser identifier is random, not a hardware fingerprint. The Firestore key is HMACed.
export const BROWSER_ID_PATTERN=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function browserClaimKey(browserId,secret){
 if(typeof browserId!=='string'||!BROWSER_ID_PATTERN.test(browserId))throw new Error('Browser storage is needed for the free assessment. Enable browser storage and try again.');
 if(typeof secret!=='string'||secret.length<32)throw new Error('Session configuration is incomplete.');
 return crypto.createHmac('sha256',secret).update('career-buddy-free-browser:v1:'+browserId.toLowerCase()).digest('hex');
}
// With the browser restriction disabled there is intentionally no Firestore
// claim snapshot. Never call .data() on that absent snapshot.
export function browserClaimFromSnapshot(snapshot){
 return snapshot?.data?.() ?? null;
}
export function browserAccess(claim,sessionId){
 return !claim||claim.ownerId===sessionId;
}
