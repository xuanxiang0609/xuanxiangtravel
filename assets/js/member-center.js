
const API = APP_CONFIG.API_URL;

async function loadMember(){

const data=
await fetch(
API+"?action=memberPoints&phone=0912345678"
).then(r=>r.json());

console.log(data);

}

loadMember();

