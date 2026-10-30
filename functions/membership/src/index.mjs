import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore,Timestamp} from 'firebase-admin/firestore';
import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret,defineString} from 'firebase-functions/params';
import {randomBytes,createHmac} from 'node:crypto';
import {hash,randomPattern,readCookie,requireSession,requireOrigin,requireRecentToken,requireLineClaims,profileInput,selectLinkedUid,PublicError} from './security.mjs';
import {memberProfileView,memberOrderView} from './member-view.mjs';
initializeApp();
const db=getFirestore('xuanxiangtravel'),auth=getAuth();
const lineSecret=defineSecret('LINE_CHANNEL_SECRET');
const publicOrigin=defineString('MEMBER_PUBLIC_ORIGIN',{description:'會員網頁的 HTTPS origin，不含路徑或結尾斜線，例如 https://xuanxiangtravel.com'});
const lineChannel=defineString('LINE_CHANNEL_ID',{default:'2010261169'});
const newRandom=()=>randomBytes(32).toString('hex');
const doc=(collection,id)=>db.collection(collection).doc(id);
const expire=(seconds)=>Timestamp.fromMillis(Date.now()+seconds*1000);
const json=(res,data,status=200)=>res.status(status).json(data);
function cookie(res,value,maxAge=600){res.set('Set-Cookie',`__session=${value}; HttpOnly; Secure; SameSite=Lax; Path=/member-auth; Max-Age=${maxAge}`)}
async function signedUser(req){
 const bearer=req.get('authorization')||'';
 if(!bearer.startsWith('Bearer '))throw new PublicError('請先登入會員',401);
 try{return await auth.verifyIdToken(bearer.slice(7),true)}catch{throw new PublicError('登入已過期，請重新登入',401)}
}
async function rateLimit(req){
 const bucket=Math.floor(Date.now()/600000),key=createHmac('sha256',lineSecret.value()).update(`${req.ip||'unknown'}|${bucket}`).digest('hex');
 const ref=doc('xuanxiangAuthLimits',key);
 await db.runTransaction(async tx=>{const old=(await tx.get(ref)).data();if((old?.count||0)>=10)throw new PublicError('操作次數較多，請十分鐘後再試',429);tx.set(ref,{count:(old?.count||0)+1,expiresAt:expire(1200)})});
}
async function postLine(path,body){
 const response=await fetch('https://api.line.me'+path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new PublicError('LINE 驗證失敗，請重新操作',401);
 return response.json();
}
async function startLine(req,res,origin,channel){
 requireOrigin(req,origin);
 const mode=req.body?.mode;
 if(!['login','link'].includes(mode))throw new PublicError('登入操作不正確');
 // Firebase Hosting forwards only __session; don't overwrite an existing site's session.
 if((req.get('cookie')||'').split(';').some(x=>x.trim().startsWith('__session=')))throw new PublicError('目前有另一個登入驗證作業，請稍後重試；若持續發生，請客服檢查網站 Session 整合',409);
 let uid=null;
 if(mode==='link'){const decoded=await signedUser(req);requireRecentToken(decoded,Date.now());uid=decoded.uid}
 await rateLimit(req);
 const state=newRandom(),browser=newRandom(),nonce=newRandom(),verifier=newRandom();
 await doc('xuanxiangAuthSessions',hash(state)).create({mode,uid,browserHash:hash(browser),nonce,verifier,used:false,expiresAt:expire(600)});
 cookie(res,browser);
 const url=new URL('https://access.line.me/oauth2/v2.1/authorize');
 url.search=new URLSearchParams({response_type:'code',client_id:channel,redirect_uri:origin+'/member-auth/line/callback',state,scope:'openid profile',nonce,code_challenge:Buffer.from(hash(verifier),'hex').toString('base64url'),code_challenge_method:'S256'}).toString();
 json(res,{url:url.href});
}
async function callback(req,res,origin,channel){
 const state=typeof req.query.state==='string'?req.query.state:'',code=typeof req.query.code==='string'?req.query.code:'';
 if(!randomPattern.test(state)||!code||code.length>4096)throw new PublicError('LINE 授權未完成，請重新操作',401);
 const browser=readCookie(req.get('cookie')),ref=doc('xuanxiangAuthSessions',hash(state));
 const session=await db.runTransaction(async tx=>{const saved=(await tx.get(ref)).data();requireSession(saved,browser,Date.now());tx.update(ref,{used:true});return saved});
 const tokens=await postLine('/oauth2/v2.1/token',{grant_type:'authorization_code',code,redirect_uri:origin+'/member-auth/line/callback',client_id:channel,client_secret:lineSecret.value(),code_verifier:session.verifier});
 if(typeof tokens.id_token!=='string')throw new PublicError('LINE 未提供可驗證的身分',401);
 const raw=await postLine('/oauth2/v2.1/verify',{id_token:tokens.id_token,client_id:channel,nonce:session.nonce});
 const claims=requireLineClaims(raw,channel,session.nonce,Date.now());
 const identityKey=hash(channel+'|'+claims.sub),identityRef=doc('xuanxiangIdentityLinks',identityKey);
 const fixedUid='line_'+identityKey;
 // Reserve the identity mapping in a transaction; never merge by name/email/phone.
 const uid=await db.runTransaction(async tx=>{const old=(await tx.get(identityRef)).data();const selected=selectLinkedUid(old?.uid,session.uid,fixedUid);tx.set(identityRef,{uid:selected,provider:'line',channel,updatedAt:Timestamp.now()},{merge:true});return selected});
 try{await auth.getUser(uid)}catch(error){if(error.code!=='auth/user-not-found'||session.mode==='link')throw error;try{await auth.createUser({uid,displayName:typeof claims.name==='string'?claims.name.slice(0,80):'LINE 會員'})}catch(createError){if(createError.code!=='auth/uid-already-exists')throw createError}}
 await doc('xuanxiangMemberBindings',uid).set({lineLinked:true,updatedAt:Timestamp.now()},{merge:true});
 const grant=newRandom();
 await doc('xuanxiangAuthGrants',hash(grant)).create({uid,mode:session.mode,browserHash:hash(browser),used:false,expiresAt:expire(90)});
 // No Firebase/LINE tokens or grant codes in URLs. The browser-bound grant is stored server-side.
 await doc('xuanxiangAuthBrowsers',hash(browser)).set({grantHash:hash(grant),expiresAt:expire(90)});
 res.redirect(303,origin+'/member-center?line=return');
}
async function redeemLine(req,res,origin){
 requireOrigin(req,origin);
 const browser=readCookie(req.get('cookie'));if(!browser)throw new PublicError('找不到驗證作業，請重新登入',401);
 const caller=req.get('authorization')?await signedUser(req):null;
 const browserRef=doc('xuanxiangAuthBrowsers',hash(browser));
 const saved=await db.runTransaction(async tx=>{
  const pointer=(await tx.get(browserRef)).data();
  if(!pointer||pointer.expiresAt.toMillis()<=Date.now())throw new PublicError('LINE 驗證已過期',401);
  const ref=doc('xuanxiangAuthGrants',pointer.grantHash),grant=(await tx.get(ref)).data();
  requireSession(grant,browser,Date.now());
  if(grant.mode==='link'&&caller?.uid!==grant.uid)throw new PublicError('綁定會員不符，請重新登入核對',403);
  tx.update(ref,{used:true});tx.delete(browserRef);return grant;
 });
 cookie(res,'',0);
 if(saved.mode==='link'){
  return json(res,{linked:true});
 }
 json(res,{customToken:await auth.createCustomToken(saved.uid)});
}
async function profile(req,res){
 const decoded=await signedUser(req),ref=doc('xuanxiangMemberProfiles',decoded.uid),legacy=doc('members',decoded.uid);
 if(req.method==='PUT'){
  const data=profileInput(req.body),now=Timestamp.now(),account=await auth.getUser(decoded.uid);
  await db.runTransaction(async tx=>{
   const previous=await tx.get(legacy);
   tx.set(ref,{...data,updatedAt:now},{merge:true});
   const shared={uid:decoded.uid,name:data.name,phone:data.contactPhone,lineId:data.lineContact,updatedAt:now};
   if(account.email)shared.email=account.email;
   if(!previous.exists)shared.createdAt=now;
   tx.set(legacy,shared,{merge:true});
  });
  return json(res,{saved:true});
 }
 const [stored,old,user,bindings]=await Promise.all([ref.get(),legacy.get(),auth.getUser(decoded.uid),doc('xuanxiangMemberBindings',decoded.uid).get()]);
 const data=memberProfileView(stored.data(),{name:user.displayName||'',...old.data()});
 json(res,{profile:data,identity:{uid:decoded.uid,email:user.email||'',googleLinked:user.providerData.some(p=>p.providerId==='google.com'),lineLinked:bindings.data()?.lineLinked===true,verifiedPhone:user.phoneNumber||''}});
}
async function orders(req,res){
 const decoded=await signedUser(req);
 const result=await db.collection('orders').where('memberUid','==',decoded.uid).orderBy('createdAt','desc').limit(101).get();
 return json(res,{orders:result.docs.slice(0,100).map(row=>memberOrderView(row.id,row.data(),decoded.uid)),hasMore:result.docs.length>100});
}
export const memberAuth=onRequest({region:'asia-east1',secrets:[lineSecret],maxInstances:3,timeoutSeconds:60},async(req,res)=>{
 res.set({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Vary':'Cookie, Authorization'});
 const origin=publicOrigin.value(),channel=lineChannel.value();
 if(!/^https:\/\/[^/]+$/.test(origin)||!/^\d+$/.test(channel))return json(res,{error:'會員服務尚未完成設定'},503);
 const path=req.path.replace(/\/+$/,'');
 try{
  if(req.method==='POST'&&path==='/member-auth/line/start')return await startLine(req,res,origin,channel);
  if(req.method==='GET'&&path==='/member-auth/line/callback')return await callback(req,res,origin,channel);
  if(req.method==='POST'&&path==='/member-auth/line/redeem')return await redeemLine(req,res,origin);
  if(req.method==='GET'&&path==='/member-auth/orders')return await orders(req,res);
  if(['GET','PUT'].includes(req.method)&&path==='/member-auth/profile'){if(req.method==='PUT')requireOrigin(req,origin);return await profile(req,res)}
  return json(res,{error:'找不到服務'},404);
 }catch(error){
  const safe=error instanceof PublicError?error:new PublicError('會員服務暫時無法使用，請稍後再試',503);
  // Do not log request headers, OAuth codes, tokens, secrets or phone numbers.
  if(path==='/member-auth/line/callback'){cookie(res,'',0);return res.redirect(303,origin+'/member-center?line=failed')}
  return json(res,{error:safe.message},safe.status);
 }
});
