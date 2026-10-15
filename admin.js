const root=$('#root');let rt=null;
const isAdmin=()=>sessionStorage.getItem('afx_admin')==='1';
function loginScreen(){
  root.innerHTML=`<div class="authbox" style="min-height:100vh;background:linear-gradient(160deg,#0b0f17,#1a2233)"><div class="authcard card"><div class="logo" style="margin-bottom:6px"><i>A</i>Aura<b>FX</b> Admin</div><p class="muted" style="font-size:13px;margin-bottom:18px">Restricted area. Authorised staff only.</p>
  <form id="f"><div class="f"><label>Username</label><input id="u" autocomplete="username"></div><div class="f"><label>Password</label><input id="p" type="password" autocomplete="current-password"></div><button class="btn full">Sign in</button></form></div></div>`;
  $('#f').onsubmit=async e=>{e.preventDefault();await DB.init();const a=L('admin');
    if($('#u').value.trim()===a.username&&await hash($('#p').value)===a.hash){sessionStorage.setItem('afx_admin','1');dash()}else toast('Invalid admin credentials','err')};
}
function dash(tab='users'){
  const us=DB.users(),pend=us.filter(u=>u.kyc.status==='pending');
  root.innerHTML=`<div class="shell"><aside class="side"><div class="logo"><i>A</i><span>Admin</span></div><nav><a data-t="users" class="${tab==='users'?'on':''}">👥 Users</a><a data-t="kyc" class="${tab==='kyc'?'on':''}">🛡 KYC Queue ${pend.length?`(${pend.length})`:''}</a><a data-t="tx" class="${tab==='tx'?'on':''}">💳 Transactions</a></nav><button class="btn ghost sm" id="lo">Log out</button></aside>
  <div class="main"><div class="top"><b>Welcome, Marcus</b><span class="muted" id="clk"></span></div><div class="page">
  <div class="stats"><div class="stat"><span>Users</span><h2>${us.length}</h2></div><div class="stat"><span>Pending KYC</span><h2>${pend.length}</h2></div><div class="stat"><span>Verified</span><h2>${us.filter(u=>u.kyc.status==='approved').length}</h2></div><div class="stat"><span>Total balances</span><h2>${money(us.reduce((s,u)=>s+u.balance,0))}</h2></div></div>
  <div class="card"><h3>${{users:'Users',kyc:'KYC Queue',tx:'All Transactions'}[tab]}</h3><div class="tw">${tab==='tx'?txT():tab==='kyc'?userT(pend):userT(us)}</div></div></div></div></div>`;
  $$('nav a').forEach(a=>a.onclick=()=>dash(a.dataset.t));$('#lo').onclick=()=>{sessionStorage.removeItem('afx_admin');loginScreen()};
  $$('[data-r]').forEach(b=>b.onclick=()=>review(+b.dataset.r,tab));$$('[data-s]').forEach(b=>b.onclick=()=>{const u=DB.user(+b.dataset.s);DB.update(u.id,{status:u.status==='active'?'suspended':'active'});dash(tab)});
  $$('[data-b]').forEach(b=>b.onclick=()=>{const u=DB.user(+b.dataset.b),v=parseFloat(prompt('Amount to add (negative to deduct):'));if(v){DB.update(u.id,{balance:u.balance+v});DB.addTx({uid:u.id,t:Date.now(),type:'Admin adjustment',ref:'ADM'+Date.now().toString(36).toUpperCase(),amount:v});dash(tab)}});
  $$('[data-d]').forEach(b=>b.onclick=()=>{if(confirm('Delete this user permanently?')){DB.saveUsers(DB.users().filter(u=>u.id!==+b.dataset.d));dash(tab)}});
}
const userT=l=>`<table><tr><th>User</th><th>Email</th><th>Mobile</th><th>Country</th><th>Balance</th><th>KYC</th><th>Status</th><th>Actions</th></tr>${l.map(u=>`<tr><td style="display:flex;gap:8px;align-items:center">${avatar(u)}${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${esc(u.country)}</td><td class="mono">${money(u.balance)}</td><td><span class="badge ${u.kyc.status}">${u.kyc.status.toUpperCase()}</span></td><td><span class="badge ${u.status}">${u.status}</span></td>
 <td style="white-space:nowrap"><button class="btn ghost sm" data-r="${u.id}">View</button> <button class="btn ghost sm" data-b="${u.id}">Balance</button> <button class="btn ghost sm" data-s="${u.id}">${u.status==='active'?'Suspend':'Activate'}</button> <button class="btn red sm" data-d="${u.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan=8 class="muted">Nothing here.</td></tr>'}</table>`;
const txT=()=>`<table><tr><th>Date</th><th>User</th><th>Type</th><th>Ref</th><th>Amount</th></tr>${DB.tx().map(t=>{const u=DB.user(t.uid);return `<tr><td>${new Date(t.t).toLocaleString()}</td><td>${esc(u?u.name:'(deleted)')}</td><td>${t.type}</td><td class="mono">${t.ref}</td><td class="mono ${t.amount>=0?'up':'down'}">${money(t.amount)}</td></tr>`}).join('')||'<tr><td colspan=5 class="muted">No transactions.</td></tr>'}</table>`;
function review(id,tab){
  const u=DB.user(id),k=u.kyc,m=document.createElement('div');m.className='modal';
  m.innerHTML=`<div class="card"><h3>${esc(u.name)} <button class="btn ghost sm" id="x">Close</button></h3>
  <p style="font-size:13px;line-height:1.8">${esc(u.email)} • ${esc(u.phone)} • ${esc(u.country)}<br>DOB: ${esc(u.dob||'–')} • Address: ${esc(u.address||'–')}<br>Payment: ${u.payment?esc(u.payment.type)+' '+u.payment.masked:'none'} • KYC: <span class="badge ${k.status}">${k.status}</span></p><br>
  ${k.id?`<p class="muted" style="font-size:12px;margin-bottom:6px">${esc(k.docType)} — submitted ${new Date(k.submitted).toLocaleString()}</p><div class="imgs"><img src="${k.id}"><img src="${k.selfie}"></div><br>
  ${k.status==='pending'?`<div class="f"><label>Reason (for decline)</label><input id="rs"></div><div class="row"><button class="btn green" id="ap">Approve</button><button class="btn red" id="dc">Decline</button></div>`:''}`:'<p class="muted">No documents submitted.</p>'}</div>`;
  document.body.appendChild(m);m.onclick=e=>{if(e.target===m||e.target.id==='x')m.remove()};
  const set=(st,note)=>{DB.update(id,{kyc:{...k,status:st,note,decided:Date.now()}});DB.addNote(id,st==='approved'?'✅ Your KYC was approved.':'❌ Your KYC was declined: '+note);m.remove();dash(tab)};
  if($('#ap')){$('#ap').onclick=()=>set('approved','');$('#dc').onclick=()=>{const r=$('#rs').value.trim();if(!r)return toast('Enter a reason','err');set('declined',r)}}
}
window.addEventListener('storage',()=>{if(isAdmin()&&!document.querySelector('.modal'))dash($('nav a.on')?.dataset.t)}); // live update when users submit KYC
(async()=>{await DB.init();isAdmin()?dash():loginScreen()})();
