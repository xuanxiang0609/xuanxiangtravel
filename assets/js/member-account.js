import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,linkWithPopup,onAuthStateChanged,signOut,signInWithCustomToken,RecaptchaVerifier,linkWithPhoneNumber} from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import {renderMemberOrders} from './member-orders.js';
import {firebaseConfig} from './firebase-member-config.js';
const auth=getAuth(initializeApp(firebaseConfig)),google=new GoogleAuthProvider();
google.setCustomParameters({prompt:'select_account'});
const $=id=>document.getElementById(id);
let current=null,confirmation=null,recaptcha=null,busy=false,starting=true,initialReturn=new URL(location.href).searchParams.get('line');
const errors={
 'auth/popup-closed-by-user':'您已關閉登入視窗，可再次操作。',
 'auth/popup-blocked':'瀏覽器封鎖登入視窗，請允許本站開啟視窗後再試。',
 'auth/operation-not-allowed':'此登入方式尚未啟用，請聯絡客服。',
 'auth/unauthorized-domain':'目前網址尚未加入 Firebase 授權網域，請聯絡客服。',
 'auth/credential-already-in-use':'這個帳號或手機已屬於另一位會員，請聯絡客服核對；不會自動合併訂單。',
 'auth/account-exists-with-different-credential':'這個帳號已有其他登入方式，請先用原方式登入，再於會員頁綁定。',
 'auth/requires-recent-login':'請先登出並重新登入，再進行綁定。',
 'auth/invalid-verification-code':'簡訊驗證碼不正確，請重新確認。',
 'auth/code-expired':'簡訊驗證碼已過期，請重新取得。',
 'auth/invalid-phone-number':'請填寫正確的台灣手機號碼。',
 'auth/too-many-requests':'驗證次數較多，請稍後再試。',
 'auth/quota-exceeded':'目前簡訊服務額度不足，請聯絡客服。'
};
function showError(error){$('error').hidden=false;$('error').textContent=errors[error.code]||error.publicMessage||'目前無法完成操作，請稍後重試；若持續發生，請聯絡客服。'}
function message(text){$('message').textContent=text;$('error').hidden=true}
async function api(path,{method='GET',body}={}){
 const token=auth.currentUser?await auth.currentUser.getIdToken():null;
 const response=await fetch('/member-auth/'+path,{method,credentials:'same-origin',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 let data;try{data=await response.json()}catch{throw {publicMessage:'會員驗證服務尚未部署或網址設定不正確，請聯絡客服。'}}
 if(!response.ok)throw {publicMessage:data.error||'會員服務暫時無法使用。'};
 return data;
}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);message('正在處理…');try{await fn()}catch(error){showError(error)}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false)}}
function clearPrivate(){for(const input of $('profile-form').elements)if(input instanceof HTMLInputElement||input instanceof HTMLSelectElement)input.value='';$('account-email').textContent='';$('member-orders').replaceChildren();$('uid').textContent='';$('phone-number').value='';$('sms-code').value='';$('code-form').hidden=true;confirmation=null;recaptcha?.clear();recaptcha=null}
async function loadProfile(){
 const data=await api('profile');
 if(current?.uid!==data.identity.uid)return;
 $('welcome').textContent=(data.profile.name||current.displayName||'會員')+'，您好。';
 $('account-email').textContent=data.identity.email;$('uid').textContent=data.identity.uid;
 $('google-state').textContent=data.identity.googleLinked?'已綁定':'尚未綁定';
 $('line-state').textContent=data.identity.lineLinked?'已綁定':'尚未綁定';
 $('phone-state').textContent=data.identity.verifiedPhone?'已驗證 '+data.identity.verifiedPhone:'尚未完成簡訊驗證';
 $('google-link').hidden=data.identity.googleLinked;$('line-link').hidden=data.identity.lineLinked;
 $('phone-form').hidden=!!data.identity.verifiedPhone;
 await loadOrders();
 for(const [name,value] of Object.entries(data.profile)){const input=$('profile-form').elements.namedItem(name);if(input instanceof HTMLInputElement||input instanceof HTMLSelectElement)input.value=value}
}
async function loadOrders(){
 const uid=current?.uid;if(!uid)return;
 try{const data=await api('orders');if(current?.uid===uid)renderMemberOrders($('member-orders'),data)}catch(error){if(current?.uid===uid)$('member-orders').textContent=error.publicMessage||'目前無法讀取訂單，請稍後更新或聯絡客服。'}
}
$('refresh-orders').addEventListener('click',()=>action(loadOrders));
$('google-login').addEventListener('click',()=>action(async()=>{await signInWithPopup(auth,google);message('Google 登入完成。')}));
$('google-link').addEventListener('click',()=>action(async()=>{if(!current)throw {publicMessage:'請先登入'};await linkWithPopup(current,google);await loadProfile();message('Google 已綁定同一會員。')}));
async function startLine(mode){
 if(mode==='login'&&auth.currentUser)throw {publicMessage:'您已登入，請改用「綁定 LINE」。'};
 const result=await api('line/start',{method:'POST',body:{mode}});
 const target=new URL(result.url);if(target.origin!=='https://access.line.me')throw {publicMessage:'LINE 授權網址不正確'};
 location.assign(target.href);
}
$('line-login').addEventListener('click',()=>action(()=>startLine('login')));
$('line-link').addEventListener('click',()=>action(()=>startLine('link')));
$('logout').addEventListener('click',()=>action(async()=>{await signOut(auth);clearPrivate();message('您已登出。')}));
$('refresh-profile').addEventListener('click',()=>action(async()=>{await loadProfile();message('已更新會員資料。')}));
$('profile-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{const form=new FormData(e.currentTarget),body=Object.fromEntries(['name','contactPhone','lineContact','region','address','vehicle'].map(k=>[k,String(form.get(k)||'').trim()]));await api('profile',{method:'PUT',body});await loadProfile();message('常用資料已儲存。')})});
$('phone-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{
 if(!current)throw {publicMessage:'請先登入會員'};
 const input=$('phone-number').value.trim(),phone=/^09\d{8}$/.test(input)?'+886'+input.slice(1):input;
 if(!/^\+8869\d{8}$/.test(phone))throw {publicMessage:'請輸入正確的台灣手機號碼'};
 try{if(!recaptcha)recaptcha=new RecaptchaVerifier(auth,'recaptcha',{size:'normal'});confirmation=await linkWithPhoneNumber(current,phone,recaptcha);$('code-form').hidden=false;message('簡訊已送出，請輸入六位數驗證碼。');$('sms-code').focus()}catch(error){recaptcha?.clear();recaptcha=null;confirmation=null;throw error}
})});
$('code-form').addEventListener('submit',e=>{e.preventDefault();action(async()=>{if(!confirmation)throw {publicMessage:'請先取得簡訊驗證碼'};const code=$('sms-code').value.trim();if(!/^\d{6}$/.test(code))throw {publicMessage:'請輸入六位數驗證碼'};await confirmation.confirm(code);confirmation=null;$('code-form').hidden=true;$('sms-code').value='';await loadProfile();message('手機簡訊驗證完成，已綁定同一會員。')})});
onAuthStateChanged(auth,async user=>{
 current=user;
 if(starting){starting=false;
  if(initialReturn==='return'){
   initialReturn=null;history.replaceState({},'',location.pathname);
   try{const result=await api('line/redeem',{method:'POST',body:{}});if(result.customToken){await signInWithCustomToken(auth,result.customToken);message('LINE 登入完成。');return}message('LINE 帳號已綁定。')}catch(error){showError(error)}
  }else if(initialReturn==='failed'){history.replaceState({},'',location.pathname);showError({publicMessage:'LINE 驗證未完成或已取消，請重新操作。'})}
 }
 $('boot').hidden=true;$('signed-out').hidden=!!user;$('signed-in').hidden=!user;
 if(!user){clearPrivate();return}
 try{await loadProfile()}catch(error){showError(error)}
},()=>{showError({publicMessage:'無法讀取登入狀態，請重新整理。'});$('boot').hidden=true});
