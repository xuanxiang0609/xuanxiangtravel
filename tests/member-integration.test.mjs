import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {memberProfileView,memberOrderView} from '../functions/membership/src/member-view.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');

test('Common profile preserves old contact fields and respects explicit clearing',()=>{
 const legacy={name:'原會員',phone:'0912345678',lineId:'line-contact',role:'admin'};
 assert.deepEqual(memberProfileView(undefined,legacy),{name:'原會員',contactPhone:'0912345678',lineContact:'line-contact',region:'',address:'',vehicle:''});
 assert.equal(memberProfileView({name:'',contactPhone:''},legacy).name,'');
 assert.equal('role' in memberProfileView({},legacy),false);
});
test('Member order projection denies another UID and excludes private fields',()=>{
 const order={memberUid:'alice',orderId:'ORDER-1',serviceType:'機場接送',travelDate:'2026-12-01',status:'待確認',price:3000,estimatedTotal:2800,paymentStatus:'未付款',adminNote:'private',driverPhone:'0900000000',phone:'0912345678'};
 assert.throws(()=>memberOrderView('1',order,'bob'),e=>e.status===403);
 const view=memberOrderView('1',order,'alice');assert.equal(view.amount,null);assert.equal(view.estimate,2800);
 for(const key of ['adminNote','driverPhone','phone','memberUid'])assert.equal(key in view,false);
 assert.equal(memberOrderView('1',{...order,status:'已確認',confirmedAt:'2026-11-01T01:00:00Z'},'alice').amount,3000);
 assert.equal(memberOrderView('1',{...order,status:'已確認',confirmedAt:'invalid'},'alice').amount,null);
});
test('Hosting retains existing site and named DB; does not publish backend or secret files',()=>{
 const c=JSON.parse(read('firebase.json'));
 assert.equal(c.hosting.public,'.');assert.equal(c.hosting.cleanUrls,true);assert.equal(c.firestore[0].database,'xuanxiangtravel');
 assert.ok(c.hosting.redirects.some(r=>r.source==='/vehicles'&&r.destination==='/fleet'));
 assert.equal(c.hosting.rewrites[0].source,'/member-auth/**');assert.equal(c.functions[0].source,'functions/membership');
 for(const file of ['functions/**','tests/**','**/.env*','package.json','package-lock.json'])assert.ok(c.hosting.ignore.includes(file));
 const csp=c.hosting.headers.flatMap(h=>h.headers).find(h=>h.key==='Content-Security-Policy').value;
 for(const origin of ['https://xuanxiang-travel.firebaseapp.com','https://www.google.com','https://www.recaptcha.net'])assert.ok(csp.includes(origin));
 const index=JSON.parse(read('firestore.indexes.json'));
 assert.ok(index.indexes.some(i=>i.collectionGroup==='orders'&&i.fields[0].fieldPath==='memberUid'&&i.fields[1].fieldPath==='createdAt'));
});
function legacy(){
 const calls=[],writes=[];let listener;
 const user={uid:'original-member',email:'member@example.test',displayName:'Google display',providerData:[{providerId:'google.com'}],getIdToken:async()=> 'fake-test-token'};
 const auth={currentUser:user};
 const message={textContent:'',setAttribute(){},scrollIntoView(){}};
 const config={FIREBASE:{apiKey:'public-test',authDomain:'test.example',projectId:'xuanxiang-travel',appId:'public-app'},FIREBASE_DATABASE_ID:'xuanxiangtravel',LINE_CHANNEL_ID:'2010261169'};
 const sandbox={window:{XUANXIANG_CONFIG:config},document:{querySelector:s=>s==='#memberMessage'||s==='#bindStatus'?message:null,addEventListener(){},dispatchEvent(){},body:{classList:{toggle(){}}}},CustomEvent:class{},console:{warn(){},error(){},log(){}},URL,URLSearchParams,location:{href:'https://travel.test/login.html',origin:'https://travel.test',search:'',assign:url=>calls.push(['navigate',url])},sessionStorage:{getItem:()=>null,removeItem(){},setItem(){}},getApps:()=>[],initializeApp:()=>({}),getAuth:()=>auth,getFirestore:(app,id)=>{calls.push(['database',id]);return {}},GoogleAuthProvider:class{setCustomParameters(){}},setPersistence:async()=>{},browserLocalPersistence:'local',onAuthStateChanged:(a,fn)=>{listener=fn},doc:()=>({}),getDoc:async()=>({exists:()=>true,data:()=>({uid:user.uid,name:'客戶原姓名',phone:'0912345678',lineId:'preserved-line'})}),setDoc:async(ref,data)=>writes.push(data),serverTimestamp:()=> 'server-time',signInWithPopup:async()=>{calls.push(['login']);return {user}},linkWithPopup:async(u)=>{calls.push(['link',u.uid]);return {user:u}},fetch:async(url,options)=>{calls.push(['fetch',url,options]);return {ok:true,json:async()=>({url:'https://access.line.me/oauth2/v2.1/authorize?state=example'})}},signOut:async()=>{}};
 const source=read('assets/js/member.js').replace(/^import[\s\S]*?from\s+"[^"]+";\s*/gm,'');
 vm.runInNewContext(source,sandbox);
 return {sandbox,auth,user,calls,writes,listener,member:sandbox.window.XXMember};
}
test('Google binding links the original UID instead of signing into another account',async()=>{
 const x=legacy();await x.member.googleBind();
 assert.ok(x.calls.some(c=>c[0]==='link'&&c[1]==='original-member'));assert.equal(x.calls.some(c=>c[0]==='login'),false);
 assert.equal(x.writes.length,1);
 for(const key of ['phone','lineId','name','role','memberVersion','lineUserId'])assert.equal(key in x.writes[0],false);
 assert.ok(x.calls.some(c=>c[0]==='database'&&c[1]==='xuanxiangtravel'));
});
test('Google binding requires the original signed-in member',async()=>{
 const x=legacy();x.auth.currentUser=null;await x.member.googleBind();
 assert.equal(x.calls.some(c=>c[0]==='login'||c[0]==='link'),false);assert.equal(x.writes.length,0);
});
test('LINE linking sends a verified token to the same-origin backend, never profile-only binding',async()=>{
 const x=legacy();await x.listener(x.user);await x.member.lineBind();
 const request=x.calls.find(c=>c[0]==='fetch');assert.equal(request[1],'/member-auth/line/start');
 assert.equal(request[2].headers.Authorization,'Bearer fake-test-token');assert.equal(JSON.parse(request[2].body).mode,'link');
 assert.equal(x.calls.find(c=>c[0]==='navigate')[1].startsWith('https://access.line.me/'),true);
 assert.equal(read('assets/js/member.js').includes('bindLineProfileToCurrentUser'),false);
});
test('New backend uses UID-scoped order query and existing named database',()=>{
 const source=read('functions/membership/src/index.mjs');
 assert.ok(source.includes("getFirestore('xuanxiangtravel')"));
 assert.ok(source.includes(".where('memberUid','==',decoded.uid)"));
 assert.ok(!source.includes("req.body.uid"));
 const rules=read('firestore.rules');
 for(const name of ['xuanxiangIdentityLinks','xuanxiangMemberBindings','xuanxiangMemberProfiles','xuanxiangAuthSessions','xuanxiangAuthGrants','xuanxiangAuthBrowsers','xuanxiangAuthLimits'])assert.ok(rules.includes(`match /${name}/{id} { allow read, write: if false; }`));
});
