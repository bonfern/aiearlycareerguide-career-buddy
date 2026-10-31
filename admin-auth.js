/* Admin sign-in: reuse Career Buddy email OTP and secure cookie; no owner password in browser. */
(() => {
 const $=id=>document.getElementById(id);
 const endpoint='/api/service?action=';
 async function api(action,payload){
  const response=await fetch(endpoint+action,{method:payload?'POST':'GET',credentials:'same-origin',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});
  let json={};try{json=await response.json();}catch{}
  if(!response.ok){const e=Error(json.error||`Request failed (${response.status}).`);e.status=response.status;throw e;}
  return json;
 }
 function status(message){$('adminStatus').textContent=message;}
 function showSignIn(message){
  $('adminLogin').hidden=false;$('adminContent').hidden=true;
  $('adminCodeForm').hidden=true;$('adminEmailForm').hidden=false;
  status(message||'Sign in with your verified administrator email.');
  $('adminEmail').focus();
 }
 async function bootstrap(onReady){
  const emailForm=$('adminEmailForm'),codeForm=$('adminCodeForm'),sendButton=$('adminSendCode'),verifyButton=$('adminVerifyCode');
  emailForm.addEventListener('submit',async e=>{
   e.preventDefault();sendButton.disabled=true;status('Sending your verification code…');
   try{
    await api('adminRequestCode',{email:$('adminEmail').value.trim(),previewCode:$('adminPreviewCode').value,privacyConsent:$('adminPrivacy').checked,adultConsent:$('adminAdult').checked,consentVersion:config.consentVersion});
    emailForm.hidden=true;codeForm.hidden=false;status('We sent a six-digit code. Check your inbox and enter it here.');$('adminOtp').focus();
   }catch(err){status(err.message);}finally{sendButton.disabled=false;}
  });
  codeForm.addEventListener('submit',async e=>{
   e.preventDefault();verifyButton.disabled=true;status('Verifying administrator access…');
   try{
    await api('adminVerifyCode',{email:$('adminEmail').value.trim(),previewCode:$('adminPreviewCode').value,code:$('adminOtp').value.trim()});
    codeForm.hidden=true;$('adminLogin').hidden=true;status('Administrator verified. Loading dashboard…');await onReady();
   }catch(err){status(err.message);codeForm.hidden=false;}finally{verifyButton.disabled=false;}
  });
  $('adminChangeEmail').addEventListener('click',()=>{codeForm.hidden=true;emailForm.hidden=false;status('Enter your administrator email.');});
  let config;
  try{config=await api('adminConfig');}catch(e){status(`Unable to load administrator configuration: ${e.message}`);return;}
  if(!config.configured){status('Career Buddy is not configured. Contact support.');return;}
  if(!config.adminEnabled){status('Owner access is not yet configured. Add FEEDBACK_ADMIN_EMAILS in Vercel Production, then redeploy.');return;}
  $('adminPreviewWrap').hidden=!config.privatePreview;
  try{
   const result=await api('adminState');$('adminLogin').hidden=true;
   status(`Verified administrator: ${result.email}. Loading dashboard…`);await onReady();
  }catch(e){
   if(e.status===401||e.status===403){showSignIn(e.status===403?'This browser is signed in with a non-admin account. Verify your allowlisted administrator email below.':'Sign in with your administrator email below to open this dashboard.');}
   else status(`Cannot check your administrator session: ${e.message}`);
  }
 }
 window.BuddyAdminAuth={bootstrap,showSignIn};
})();
