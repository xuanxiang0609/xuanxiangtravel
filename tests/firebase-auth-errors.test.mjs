import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const source=readFileSync(new URL('../functions/membership/src/index.mjs',import.meta.url),'utf8');
const body=source.slice(source.indexOf('async function signedUser('),source.indexOf('async function rateLimit('));
class PublicError extends Error{constructor(message,status){super(message);this.status=status}}
function fixture(code){const logs=[];const auth={verifyIdToken:async(value,revoked)=>{assert.equal(value,'synthetic');assert.equal(revoked,true);if(code)throw {code,privateToken:'never-log'};return {uid:'test-member'}}};const fn=new Function('auth','PublicError','console',body+';return signedUser;')(auth,PublicError,{warn:x=>logs.push(x)});return {fn,logs}}
const request={get:()=> 'Bearer synthetic'};
test('valid tokens retain revocation checking; invalid credentials return 401',async()=>{assert.equal((await fixture().fn(request)).uid,'test-member');for(const code of ['auth/id-token-expired','auth/id-token-revoked','auth/invalid-id-token','auth/argument-error','auth/user-disabled','auth/user-not-found'])await assert.rejects(()=>fixture(code).fn(request),e=>e.status===401)});
test('service failures return 503 and only allowlisted diagnostics',async()=>{for(const code of ['auth/insufficient-permission','auth/internal-error','app/network-error','unknown-with-sensitive-content']){const f=fixture(code);await assert.rejects(()=>f.fn(request),e=>e.status===503);const output=f.logs.join('');assert.doesNotMatch(output,/synthetic|never-log|sensitive-content/);assert.equal(JSON.parse(output).event,'firebase_token_verification_unavailable')}});
