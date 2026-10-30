import {createHash,timingSafeEqual} from 'node:crypto';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const randomPattern=/^[a-f0-9]{64}$/;
export class PublicError extends Error{constructor(message,status=400){super(message);this.status=status}}
export function requireOrigin(req,origin){if(req.get('origin')!==origin)throw new PublicError('請從會員頁面操作',403)}
export function readCookie(header=''){
 const values=header.split(';').map(x=>x.trim()).filter(x=>x.startsWith('__session=')).map(x=>x.slice(10));
 if(values.length!==1||!randomPattern.test(values[0]))return null;
 return values[0];
}
export function requireSession(session,browser,now){
 if(!session||!browser||!randomPattern.test(browser)||session.used||session.expiresAt.toMillis()<=now)throw new PublicError('驗證已逾時或已使用，請重新登入',401);
 const actual=Buffer.from(hash(browser),'hex'),expected=Buffer.from(session.browserHash,'hex');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new PublicError('驗證裝置不符，請重新登入',401);
}
export function requireRecentToken(decoded,now){
 if(!decoded?.uid||!Number.isFinite(decoded.auth_time)||now/1000-decoded.auth_time>300||decoded.auth_time>now/1000+60)throw new PublicError('請重新登入後再綁定 LINE',401);
}
export function requireLineClaims(claims,channel,nonce,now){
 if(!claims||claims.iss!=='https://access.line.me'||claims.aud!==channel||claims.nonce!==nonce||typeof claims.sub!=='string'||!/^U[a-f0-9]{32}$/.test(claims.sub)||!Number.isFinite(claims.exp)||claims.exp<=now/1000)throw new PublicError('LINE 身分驗證未通過',401);
 return claims;
}
export function profileInput(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['name','contactPhone','lineContact','region','address','vehicle'].includes(k)))throw new PublicError('會員資料格式不正確');
 const limits={name:80,contactPhone:40,lineContact:80,region:80,address:200,vehicle:40},result={};
 for(const [k,max] of Object.entries(limits)){if(typeof value[k]!=='string'||value[k].length>max)throw new PublicError('請檢查會員資料長度');result[k]=value[k].trim()}
 if(result.contactPhone&&!/^[+\d()\s-]{5,50}$/.test(result.contactPhone))throw new PublicError('聯絡電話格式不正確');
 if(!['','五人座','休旅車','九人座','VITO','Alphard','Lexus LM','明星保母車'].includes(result.vehicle))throw new PublicError('車型選項不正確');
 return result;
}
export function selectLinkedUid(existingUid,targetUid,fallbackUid){
 if(targetUid&&existingUid&&existingUid!==targetUid)throw new PublicError('這個 LINE 已綁定其他會員，請聯絡客服核對',409);
 return targetUid||existingUid||fallbackUid;
}
