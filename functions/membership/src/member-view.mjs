import {PublicError} from './security.mjs';
const text=(value,max=300)=>typeof value==='string'?value.slice(0,max):'';
export function memberProfileView(current={},legacy={}){
 const fallback={name:text(legacy.name||legacy.displayName,80),contactPhone:text(legacy.phone,40),lineContact:text(legacy.lineId,80),region:'',address:'',vehicle:''};
 return Object.fromEntries(Object.entries(fallback).map(([key,value])=>[key,typeof current?.[key]==='string'?current[key]:value]));
}
export function memberOrderView(id,data,uid){
 if(!uid||data.memberUid!==uid)throw new PublicError('無權讀取此訂單',403);
 const confirmedAt=data.confirmedAt?.toMillis?.()??Date.parse(data.confirmedAt||'');
 const confirmed=Number.isFinite(confirmedAt)&&confirmedAt>0&&['已確認','已派車','進行中','已完成'].includes(data.status);
 const positive=n=>typeof n==='number'&&Number.isFinite(n)&&n>0?n:null;
 return {id:text(data.orderId||id,100),service:text(data.serviceType,60),detail:text(data.serviceDetail,120),date:text(data.travelDate,40),time:text(data.travelTime,40),pickup:text(data.pickupAddress,300),destination:text(data.dropoffAddress,300),people:typeof data.passengers==='number'?data.passengers:null,status:text(data.status,80)||'待客服核對',paymentStatus:text(data.paymentStatus,80)||'待核對',amount:confirmed?positive(data.price):null,estimate:positive(data.estimatedTotal)};
}
