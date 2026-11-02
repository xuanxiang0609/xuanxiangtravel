export const LINE_CALLBACK_REASONS=['cancelled','callback_invalid','browser_session','session_invalid','line_exchange','line_claims','identity_conflict','identity_store','firebase_account','grant_store','service'];
export function lineCallbackReason(stage,{cancelled=false,browserPresent=true,status=503}={}){
 if(cancelled)return 'cancelled';
 if(stage==='input')return 'callback_invalid';
 if(stage==='session')return browserPresent?'session_invalid':'browser_session';
 if(stage==='exchange')return 'line_exchange';
 if(stage==='claims')return 'line_claims';
 if(stage==='identity')return status===409?'identity_conflict':'identity_store';
 if(stage==='account')return 'firebase_account';
 if(stage==='grant')return 'grant_store';
 return 'service';
}
export function safeLineErrorCode(error){const code=error?.lineCode??error?.code;return ['invalid_client','invalid_grant','invalid_request','unsupported_grant_type','auth/insufficient-permission','auth/internal-error','auth/user-not-found',3,4,5,6,7,8,9,10,13,14,16].includes(code)?String(code):'unknown';}
