
const API = APP_CONFIG.API_URL;

async function loadMembers(){

const data =
await fetch(
API+"?action=memberPoints&phone=0912345678"
).then(r=>r.json());

console.log(data);

}

loadMembers();

