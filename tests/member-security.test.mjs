import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hash,readCookie,requireSession,requireOrigin,requireRecentToken,requireLineClaims,profileInput,selectLinkedUid,PublicError} from '../functions/membership/src/security.mjs';
const now=1800000000000,browser='a'.repeat(64),other='b'.repeat(64);
const session=()=>({browserHash:hash(browser),used:false,expiresAt:{toMillis:()=>now+1000}});
test('OAuth session accepts only its originating browser',()=>{
 assert.doesNotThrow(()=>requireSession(session(),browser,now));
 assert.throws(()=>requireSession(session(),other,now),PublicError);
});
test('Expired or redeemed OAuth sessions cannot be reused',()=>{
 assert.throws(()=>requireSession({...session(),used:true},browser,now),PublicError);
 assert.throws(()=>requireSession(session(),browser,now+1000),PublicError);
 assert.throws(()=>requireSession(null,browser,now),PublicError);
 assert.throws(()=>requireSession(session(),null,now),PublicError);
});
test('Cookie parser rejects duplicate, missing and malformed sessions',()=>{
 assert.equal(readCookie('foo=1; __session='+browser),browser);
 assert.equal(readCookie('__session='+browser+'; __session='+other),null);
 assert.equal(readCookie('__session=not-random'),null);
 assert.equal(readCookie('foo=1'),null);
});
test('Mutations reject foreign and missing origins',()=>{
 assert.doesNotThrow(()=>requireOrigin({get:()=> 'https://travel.test'},'https://travel.test'));
 for(const origin of ['https://evil.test',undefined,'null'])assert.throws(()=>requireOrigin({get:()=>origin},'https://travel.test'),PublicError);
});
test('Sensitive linking requires a recent Firebase authentication',()=>{
 assert.doesNotThrow(()=>requireRecentToken({uid:'u1',auth_time:now/1000-30},now));
 for(const decoded of [null,{uid:'u1',auth_time:now/1000-301},{uid:'u1',auth_time:now/1000+61},{uid:'u1'},{auth_time:now/1000}])assert.throws(()=>requireRecentToken(decoded,now),PublicError);
});
const claims={iss:'https://access.line.me',aud:'2010261169',nonce:'nonce-1',sub:'U'+'c'.repeat(32),exp:now/1000+60};
test('LINE issuer, channel, nonce, subject and expiry must all match',()=>{
 assert.equal(requireLineClaims(claims,'2010261169','nonce-1',now),claims);
 for(const change of [{iss:'https://evil.test'},{aud:'other-channel'},{nonce:'replayed-nonce'},{sub:'not-a-line-user'},{exp:now/1000}])assert.throws(()=>requireLineClaims({...claims,...change},'2010261169','nonce-1',now),PublicError);
});
test('Linked login preserves the UID and rejects another member',()=>{
 assert.equal(selectLinkedUid('google-user',null,'line-user'),'google-user');
 assert.equal(selectLinkedUid(null,'google-user','line-user'),'google-user');
 assert.equal(selectLinkedUid(null,null,'line-user'),'line-user');
 assert.throws(()=>selectLinkedUid('other-user','my-user','line-user'),e=>e.status===409);
});
const profile={name:'測試旅客',contactPhone:'0912-345-678',lineContact:'test-line',region:'台中',address:'虛構測試地址',vehicle:'九人座'};
test('Contact fields cannot claim verified identity or another UID',()=>{
 assert.deepEqual(profileInput(profile),profile);
 for(const extra of [{uid:'other-member'},{verifiedPhone:'+886912345678'},{lineLinked:true},{email:'victim@example.test'}])assert.throws(()=>profileInput({...profile,...extra}),PublicError);
 assert.throws(()=>profileInput({...profile,vehicle:'unknown'}),PublicError);
 assert.throws(()=>profileInput({...profile,contactPhone:'script'}),PublicError);
});
test('The pinned Firebase SDK exposes the required account linking APIs',async()=>{
 const sdk=await import('firebase/auth');
 for(const name of ['linkWithPopup','linkWithPhoneNumber','signInWithCustomToken','RecaptchaVerifier','onAuthStateChanged'])assert.equal(typeof sdk[name],'function');
});
