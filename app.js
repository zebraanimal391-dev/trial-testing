let me=null,view='trade',sym='EURUSD',ctype='candle',tickFn=null;
const root=$('#root');
const NAV=[['trade','📈 Trade'],['portfolio','💼 Portfolio'],['wallet','💳 Wallet'],['kyc','🛡 Verification'],['settings','⚙ Settings']];

/* ---------- Auth ---------- */
function authScreen(mode='login'){
  root.innerHTML=`<div class="auth"><div class="hero"><div class="logo"><i>A</i>Aura<b>FX</b></div>
  <h1>Trade 30+ currency pairs with institutional-grade tools.</h1><p>Live charts, one-click execution, instant wallet funding and secure KYC verification.</p>
  <span class="pill">🎁 Get a 30% bonus on your first deposit</span></div>
  <div class="authbox"><div class="authcard card"><h2>${mode==='login'?'Welcome back':'Create your account'}</h2>
  <div class="tabs"><button class="${mode==='login'?'on':''}" data-m="login">Log in</button><button class="${mode==='register'?'on':''}" data-m="register">Register</button></div>
  <form id="af" novalidate>${mode==='login'?`
   <div class="f"><label>Email</label><input id="email" type="email" autocomplete="email" required></div>
   <div class="f"><label>Password</label><input id="pw" type="password" autocomplete="current-password" required></div>`:`
   <div class="f"><label>Full name</label><input id="name" required></div>
   <div class="row"><div class="f"><label>Email</label><input id="email" type="email" required></div><div class="f"><label>Mobile number</label><input id="phone" type="tel" placeholder="+1 555 000 0000" required></div></div>
   <div class="row"><div class="f"><label>Country</label><input id="country" required></div><div class="f"><label>Password (8+ chars)</label><input id="pw" type="password" minlength="8" required></div></div>
   <div class="note">🎁 Make your first deposit and receive a <b>30% bonus</b>. You can add a payment method later in Settings (optional).</div>
   <label style="font-size:12px;display:flex;gap:8px;align-items:center"><input type="checkbox" id="terms" style="width:auto"> I accept the Terms and Risk Disclosure</label><br>`}
   <button class="btn full" id="sub">${mode==='login'?'Log in':'Create account'}</button></form>
   <p class="muted" style="font-size:11px;margin-top:14px">Trading leveraged products carries a high risk. This is a simulation environment.</p></div></div></div>`;
  $$('.tabs button').forEach(b=>b.onclick=()=>authScreen(b.dataset.m));
  $('#af').onsubmit=async e=>{e.preventDefault();const b=$('#sub');b.disabled=true;try{mode==='login'?await login():await register()}catch(x){toast(x.message,'err')}b.disabled=false};
}
async function login(){
  const e=$('#email').value.trim(),u=DB.byEmail(e);
  if(!u||u.hash!==await hash($('#pw').value))throw new Error('Incorrect email or password');
  if(u.status==='suspended')throw new Error('Account suspended. Contact support.');
  S('session',u.id);enter(u.id);
}
async function register(){
  const v=id=>$('#'+id).value.trim(),name=v('name'),email=v('email'),phone=v('phone'),country=v('country'),pw=$('#pw').value;
  if(name.length<3)throw new Error('Enter your full name');
  if(!/^\S+@\S+\.\S+$/.test(email))throw new Error('Enter a valid email');
  if(!/^\+?[\d\s()-]{7,18}$/.test(phone))throw new Error('Enter a valid mobile number');
  if(!country)throw new Error('Enter your country');
  if(pw.length<8)throw new Error('Password must be at least 8 characters');
  if(!$('#terms').checked)throw new Error('Please accept the terms');
  if(DB.byEmail(email))throw new Error('Email already registered');
  const u=DB.add({id:Date.now(),name,email,phone,country,address:'',dob:'',avatar:'',hash:await hash(pw),balance:0,bonusTotal:0,firstDeposit:false,leverage:100,lot:0.1,ctype:'candle',theme:'system',confirm:true,payment:null,kyc:{status:'none'},status:'active',created:Date.now()});
  DB.addNote(u.id,'🎁 Welcome! Deposit now and get a 30% bonus on your first deposit.');
  S('session',u.id);enter(u.id);toast('🎁 Account created! Get a 30% bonus on your first deposit.','ok');
}
function logout(){S('session',null);me=null;Market.off(tickFn);authScreen()}

/* ---------- Shell ---------- */
function enter(id){
  me=DB.user(id);localStorage.setItem('afx_themepref',me.theme);applyTheme(me.theme);ctype=me.ctype;view='trade';
  root.innerHTML=`<div class="shell"><aside class="side"><div class="logo"><i>A</i><span>Aura<b>FX</b></span></div><nav>${NAV.map(n=>`<a data-v="${n[0]}">${n[1]}</a>`).join('')}</nav>
   <button class="btn ghost sm" id="lo">Log out</button></aside>
   <div class="main"><div class="top"><div class="metrics" id="mt"></div><div class="me"><button class="bell" id="bell">🔔<i id="nc" hidden></i></button><span id="who"></span></div></div><div class="page" id="pg"></div></div></div>`;
  $$('nav a').forEach(a=>a.onclick=()=>go(a.dataset.v));$('#lo').onclick=logout;$('#bell').onclick=showNotes;
  tickFn=onTick;Market.on(tickFn);Market.start();go('trade');
  setInterval(syncMe,2000);
}
function syncMe(){ // real-time sync: picks up admin KYC/status decisions
  if(!me)return;const n=DB.user(me.id);if(!n)return;
  if(n.status==='suspended'){toast('Your account was suspended','err');return logout()}
  if(n.kyc.status!==me.kyc.status){const s=n.kyc.status;toast(s==='approved'?'✅ Your identity has been verified!':s==='declined'?'❌ KYC declined: '+(n.kyc.note||'please resubmit'):'KYC status: '+s,s==='approved'?'ok':'err');me=n;if(view==='kyc')go('kyc')}
  me=n;noteBadge();
}
function noteBadge(){const c=DB.notes().filter(n=>n.uid===me.id&&!n.read).length,b=$('#nc');if(b){b.hidden=!c;b.textContent=c}}
function showNotes(){
  const ns=DB.notes().filter(n=>n.uid===me.id);S('notes',DB.notes().map(n=>n.uid===me.id?{...n,read:true}:n));noteBadge();
  const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="card"><h3>Notifications <button class="btn ghost sm" id="x">Close</button></h3>${ns.map(n=>`<p style="padding:8px 0;border-bottom:1px solid var(--line)">${esc(n.text)}<br><small class="muted">${new Date(n.t).toLocaleString()}</small></p>`).join('')||'<p class="muted">Nothing yet.</p>'}</div>`;
  document.body.appendChild(m);m.onclick=e=>{if(e.target===m||e.target.id==='x')m.remove()};
}
function go(v){view=v;$$('nav a').forEach(a=>a.classList.toggle('on',a.dataset.v===v));$('#pg').innerHTML='';({trade:vTrade,portfolio:vPortfolio,wallet:vWallet,kyc:vKyc,settings:vSettings})[v]();onTick();noteBadge()}

/* ---------- Account maths & trading engine ---------- */
function acct(){
  const pos=DB.positions().filter(p=>p.uid===me.id);let fl=0,mg=0;
  pos.forEach(p=>{fl+=Market.pnl(p,Market.px(p.sym,p.dir>0?'bid':'ask'));mg+=p.margin});
  const eq=me.balance+fl;return{pos,fl,mg,eq,free:eq-mg,lvl:mg?eq/mg*100:0};
}
function closePos(id,reason='Manual'){
  const all=DB.positions(),p=all.find(x=>x.id===id);if(!p)return;
  const ex=Market.px(p.sym,p.dir>0?'bid':'ask'),pl=Market.pnl(p,ex);
  DB.savePos(all.filter(x=>x.id!==id));me=DB.update(me.id,{balance:me.balance+pl});
  DB.saveHist([{...p,exit:ex,pl,reason,closed:Date.now()},...DB.history()]);
}
function openPos(dir){
  const lots=+$('#lots').value,m=Market.meta[sym],lev=me.leverage;
  if(!(lots>=0.01&&lots<=100))return toast('Lot size must be between 0.01 and 100','err');
  const entry=Market.px(sym,dir>0?'ask':'bid'),margin=Market.marginFor(sym,lots,lev),a=acct();
  if(me.balance<=0)return toast('Deposit funds in Wallet to start trading','err');
  if(margin>a.free)return toast(`Insufficient free margin. Required ${money(margin)}`,'err');
  const sl=parseFloat($('#sl').value)||null,tp=parseFloat($('#tp').value)||null;
  if(sl&&(dir>0?sl>=entry:sl<=entry))return toast('Stop loss is on the wrong side of price','err');
  if(tp&&(dir>0?tp<=entry:tp>=entry))return toast('Take profit is on the wrong side of price','err');
  if(me.confirm&&!confirm(`${dir>0?'BUY':'SELL'} ${lots} lots ${sym} @ ${entry.toFixed(m.d)}?`))return;
  DB.savePos([...DB.positions(),{id:Date.now()+Math.random(),uid:me.id,sym,dir,lots,entry,sl,tp,margin,opened:Date.now()}]);
  toast(`${dir>0?'Bought':'Sold'} ${lots} ${sym} @ ${entry.toFixed(m.d)}`,'ok');onTick();
}
function checkStops(){
  DB.positions().filter(p=>p.uid===me.id).forEach(p=>{
    const px=Market.px(p.sym,p.dir>0?'bid':'ask');
    if(p.sl&&(p.dir>0?px<=p.sl:px>=p.sl)){closePos(p.id,'Stop Loss');toast(`Stop loss hit on ${p.sym}`,'err')}
    else if(p.tp&&(p.dir>0?px>=p.tp:px<=p.tp)){closePos(p.id,'Take Profit');toast(`Take profit hit on ${p.sym}`,'ok')}
  });
  const a=acct();if(a.pos.length&&a.lvl<50){a.pos.forEach(p=>closePos(p.id,'Stop-out'));toast('Margin level below 50% — positions closed (stop-out)','err')}
}
function posTable(list,live=true){
  if(!list.length)return '<p class="muted" style="padding:14px">No open positions.</p>';
  return `<div class="tw"><table><tr><th>Symbol</th><th>Type</th><th>Lots</th><th>Entry</th><th>Price</th><th>SL</th><th>TP</th><th>P/L</th><th></th></tr>${list.map(p=>{const m=Market.meta[p.sym],px=Market.px(p.sym,p.dir>0?'bid':'ask'),pl=Market.pnl(p,px);
   return `<tr><td><b>${p.sym}</b></td><td class="${p.dir>0?'up':'down'}">${p.dir>0?'BUY':'SELL'}</td><td>${p.lots}</td><td class="mono">${p.entry.toFixed(m.d)}</td><td class="mono">${px.toFixed(m.d)}</td><td class="mono">${p.sl?p.sl.toFixed(m.d):'–'}</td><td class="mono">${p.tp?p.tp.toFixed(m.d):'–'}</td><td class="mono ${pl>=0?'up':'down'}">${money(pl)}</td><td><button class="btn red sm" onclick="closePos(${p.id});go(view)">Close</button></td></tr>`}).join('')}</table></div>`;
}
let lastPosHtml='';
function onTick(){
  if(!me)return;checkStops();me=DB.user(me.id)||me;const a=acct();
  const mt=$('#mt');if(mt)mt.innerHTML=`<div>Balance<b>${money(me.balance)}</b></div><div>Equity<b>${money(a.eq)}</b></div><div>Margin<b>${money(a.mg)}</b></div><div>Free margin<b>${money(a.free)}</b></div><div>Floating P/L<b class="${a.fl>=0?'up':'down'}">${money(a.fl)}</b></div>`;
  const w=$('#who');if(w)w.innerHTML=avatar(me)+' '+esc(me.name.split(' ')[0]);
  if(view==='trade'){
    const m=Market.meta[sym],cv=$('#cv');if(cv)drawChart(cv,sym,ctype);
    const bid=Market.px(sym,'bid'),ask=Market.px(sym,'ask');
    if($('#sellp')){$('#sellp').textContent=bid.toFixed(m.d);$('#buyp').textContent=ask.toFixed(m.d);$('#hdp').textContent=Market.mid[sym].toFixed(m.d);
      const c=Market.candles[sym],ch=(Market.mid[sym]/c[0].o-1)*100;$('#hdc').textContent=(ch>=0?'+':'')+ch.toFixed(2)+'%';$('#hdc').className='mono '+(ch>=0?'up':'down');
      $$('.wi').forEach(el=>{const s=el.dataset.s,cc=Market.candles[s],x=(Market.mid[s]/cc[0].o-1)*100;el.querySelector('.r').innerHTML=`${Market.mid[s].toFixed(Market.meta[s].d)}<br><small class="${x>=0?'up':'down'}">${x>=0?'+':''}${x.toFixed(2)}%</small>`})}
    const h=posTable(a.pos),pp=$('#pos');if(pp&&h!==lastPosHtml){pp.innerHTML=h;lastPosHtml=h}
  }
  if(view==='portfolio'){const pp=$('#ppos');if(pp)pp.innerHTML=posTable(a.pos)}
}

/* ---------- Views ---------- */
function vTrade(){
  const cats=['Majors','Crosses','Metals','Crypto'];
  $('#pg').innerHTML=`<div class="grid3"><div class="card"><h3>Markets <span class="badge active">LIVE</span></h3><div class="wl">${cats.map(c=>`<h5>${c.toUpperCase()}</h5>`+Market.list.filter(s=>Market.meta[s].cat===c).map(s=>`<div class="wi ${s===sym?'on':''}" data-s="${s}"><div><b>${s.slice(0,3)}/${s.slice(3)}</b></div><div class="r"></div></div>`).join('')).join('')}</div></div>
  <div style="display:flex;flex-direction:column;gap:18px"><div class="card"><div class="chead"><div><h2>${sym.slice(0,3)}/${sym.slice(3)} <span class="mono" id="hdp"></span> <small id="hdc"></small></h2></div>
   <div class="seg"><button data-c="candle" class="${ctype==='candle'?'on':''}">Candles</button><button data-c="line" class="${ctype==='line'?'on':''}">Line</button></div></div><canvas class="cv" id="cv"></canvas></div>
   <div class="card"><h3>Open Positions</h3><div id="pos"></div></div></div>
  <div class="card"><h3>New Order</h3><div class="row"><div class="f"><label>Lots</label><input id="lots" type="number" step="0.01" min="0.01" value="${me.lot}"></div></div>
   <div class="row"><div class="f"><label>Stop loss</label><input id="sl" type="number" step="any" placeholder="Optional"></div><div class="f"><label>Take profit</label><input id="tp" type="number" step="any" placeholder="Optional"></div></div>
   <p class="muted" style="font-size:12px;margin-bottom:12px">Leverage 1:${me.leverage} • Contract ${Market.meta[sym].contract.toLocaleString()}</p>
   <div class="tradebtns"><button class="tb s" id="bs">SELL<b id="sellp"></b></button><button class="tb b" id="bb">BUY<b id="buyp"></b></button></div></div></div>`;
  $$('.wi').forEach(el=>el.onclick=()=>{sym=el.dataset.s;lastPosHtml='';vTrade();onTick()});
  $$('.seg button').forEach(b=>b.onclick=()=>{ctype=b.dataset.c;DB.update(me.id,{ctype});$$('.seg button').forEach(x=>x.classList.toggle('on',x===b));onTick()});
  $('#bs').onclick=()=>openPos(-1);$('#bb').onclick=()=>openPos(1);lastPosHtml='';
}
function vPortfolio(){
  const a=acct(),h=DB.history().filter(x=>x.uid===me.id),tot=h.reduce((s,x)=>s+x.pl,0),w=h.filter(x=>x.pl>0).length;
  $('#pg').innerHTML=`<div class="stats"><div class="stat"><span>Equity</span><h2>${money(a.eq)}</h2></div><div class="stat"><span>Realised P/L</span><h2 class="${tot>=0?'up':'down'}">${money(tot)}</h2></div><div class="stat"><span>Win rate</span><h2>${h.length?Math.round(w/h.length*100):0}%</h2></div><div class="stat"><span>Margin level</span><h2>${a.mg?a.lvl.toFixed(0)+'%':'–'}</h2></div></div>
  <div class="card"><h3>Open Positions</h3><div id="ppos"></div></div>
  <div class="card"><h3>Trade History</h3><div class="tw"><table><tr><th>Closed</th><th>Symbol</th><th>Type</th><th>Lots</th><th>Entry</th><th>Exit</th><th>Reason</th><th>P/L</th></tr>${h.slice(0,50).map(x=>{const d=Market.meta[x.sym].d;return `<tr><td>${new Date(x.closed).toLocaleString()}</td><td>${x.sym}</td><td class="${x.dir>0?'up':'down'}">${x.dir>0?'BUY':'SELL'}</td><td>${x.lots}</td><td class="mono">${x.entry.toFixed(d)}</td><td class="mono">${x.exit.toFixed(d)}</td><td>${x.reason}</td><td class="mono ${x.pl>=0?'up':'down'}">${money(x.pl)}</td></tr>`}).join('')||'<tr><td colspan=8 class="muted">No closed trades yet.</td></tr>'}</table></div></div>`;
}
function vWallet(){
  const pm=me.payment,tx=DB.tx().filter(t=>t.uid===me.id);
  $('#pg').innerHTML=`${!me.firstDeposit?'<div class="note">🎁 <b>30% bonus</b> on your first deposit — deposit $100 and get $130 in your account.</div>':''}
  <div class="grid2"><div class="card"><h3>Deposit / Withdraw</h3>${pm?`<p class="muted" style="margin-bottom:12px">Using ${PaymentAPI.methods.find(m=>m.id===pm.type).name} ${pm.masked}</p>
   <div class="f"><label>Amount (USD)</label><input id="amt" type="number" min="10" step="any" placeholder="Min $10"></div><div class="row"><button class="btn green" id="dep">Deposit</button><button class="btn ghost" id="wd">Withdraw</button></div>`:
   `<p class="muted" style="margin-bottom:12px">Add a payment method to fund your account.</p><button class="btn" onclick="go('settings')">Add payment method</button>`}</div>
  <div class="card"><h3>Balance</h3><div class="stat"><span>Available balance</span><h2>${money(me.balance)}</h2></div><p class="muted" style="font-size:12px;margin-top:10px">Bonus credited so far: ${money(me.bonusTotal||0)}. Withdrawals require approved KYC.</p></div></div>
  <div class="card"><h3>Transactions</h3><div class="tw"><table><tr><th>Date</th><th>Type</th><th>Reference</th><th>Amount</th></tr>${tx.map(t=>`<tr><td>${new Date(t.t).toLocaleString()}</td><td>${t.type}</td><td class="mono">${t.ref}</td><td class="mono ${t.amount>=0?'up':'down'}">${money(t.amount)}</td></tr>`).join('')||'<tr><td colspan=4 class="muted">No transactions.</td></tr>'}</table></div></div>`;
  if(!pm)return;
  const run=async kind=>{const amount=+$('#amt').value;$('#dep').disabled=$('#wd').disabled=true;
    try{
      if(kind==='withdraw'){if(me.kyc.status!=='approved')throw new Error('Complete KYC verification before withdrawing');if(amount>acct().free)throw new Error('Amount exceeds free margin')}
      const r=await PaymentAPI[kind]({userId:me.id,amount,method:pm.type});
      let credit=kind==='deposit'?amount:-amount,bonus=0;
      if(kind==='deposit'&&!me.firstDeposit){bonus=amount*.3;DB.addTx({uid:me.id,t:Date.now(),type:'Bonus (30%)',ref:r.ref,amount:bonus})}
      me=DB.update(me.id,{balance:me.balance+credit+bonus,firstDeposit:me.firstDeposit||kind==='deposit',bonusTotal:(me.bonusTotal||0)+bonus});
      DB.addTx({uid:me.id,t:Date.now(),type:kind==='deposit'?'Deposit':'Withdrawal',ref:r.ref,amount:credit});
      if(bonus){DB.addNote(me.id,`🎁 30% first-deposit bonus of ${money(bonus)} credited!`);toast(`🎁 30% bonus of ${money(bonus)} credited!`,'ok')}
      toast(kind==='deposit'?'Deposit successful':'Withdrawal submitted','ok');
    }catch(e){toast(e.message,'err')}
    vWallet();};
  $('#dep').onclick=()=>run('deposit');$('#wd').onclick=()=>run('withdraw');
}
function vKyc(){
  const k=me.kyc;let form=`<div class="f"><label>Document type</label><select id="dt"><option>Passport</option><option>National ID</option><option>Driver's licence</option></select></div>
  <div class="row"><div class="f"><div class="upl">ID document<br><input type="file" id="f1" accept="image/*"><div id="p1"></div></div></div><div class="f"><div class="upl">Selfie holding your ID<br><input type="file" id="f2" accept="image/*"><div id="p2"></div></div></div></div><button class="btn" id="ks">Submit for verification</button>`;
  $('#pg').innerHTML=`<div class="card" style="max-width:720px"><h3>Identity Verification <span class="badge ${k.status}">${k.status==='none'?'NOT SUBMITTED':k.status.toUpperCase()}</span></h3>
  ${k.status==='approved'?'<p>✅ Your identity is verified. Withdrawals are enabled.</p>':k.status==='pending'?'<p>⏳ Your documents are under review. This page updates automatically once the compliance team decides.</p>':(k.status==='declined'?`<div class="note">Declined: ${esc(k.note||'Documents unclear')}. Please resubmit.</div>`:'')+form}</div>`;
  if(k.status==='pending'||k.status==='approved')return;
  const imgs={};[1,2].forEach(i=>$('#f'+i).onchange=async e=>{try{imgs[i]=await imgToData(e.target.files[0]);$('#p'+i).innerHTML=`<img src="${imgs[i]}">`}catch(x){toast(x.message,'err')}});
  $('#ks').onclick=()=>{if(!imgs[1]||!imgs[2])return toast('Upload both images','err');
    try{me=DB.update(me.id,{kyc:{status:'pending',docType:$('#dt').value,id:imgs[1],selfie:imgs[2],submitted:Date.now()}})}catch{return toast('Images too large for browser storage — use smaller photos','err')}
    toast('KYC submitted','ok');vKyc()};
}
function vSettings(){
  const pm=me.payment,phoneLocked=!!me.phone;
  $('#pg').innerHTML=`<div class="grid2"><div class="card"><h3>Personal Information</h3>
   <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">${avatar(me,'lg')}<div><input type="file" id="avf" accept="image/*"><small class="muted">JPG/PNG, resized automatically</small></div></div>
   <div class="f"><label>Full name</label><input id="n" value="${esc(me.name)}"></div>
   <div class="row"><div class="f"><label>Email</label><input id="e" value="${esc(me.email)}"></div><div class="f"><label>Mobile ${phoneLocked?'🔒':''}</label><input id="ph" value="${esc(me.phone)}" ${phoneLocked?'disabled':''}></div></div>
   <div class="row"><div class="f"><label>Date of birth</label><input id="dob" type="date" value="${me.dob}"></div><div class="f"><label>Country</label><input id="c" value="${esc(me.country)}"></div></div>
   <div class="f"><label>Address</label><input id="ad" value="${esc(me.address)}"></div><button class="btn" id="sp">Save personal info</button></div>
  <div style="display:flex;flex-direction:column;gap:18px"><div class="card"><h3>Payment Method ${pm?'🔒':''}</h3>${pm?`<p><b>${PaymentAPI.methods.find(m=>m.id===pm.type).name}</b><br>${esc(pm.holder)} • ${pm.masked}</p><p class="muted" style="font-size:12px;margin-top:8px">Locked for security. Contact support to change it.</p>`:`
   <div class="pm">${PaymentAPI.methods.map((m,i)=>`<label><input type="radio" name="pt" value="${m.id}" ${i?'':'checked'}>${m.name}</label>`).join('')}</div><br>
   <div class="f"><label>Account holder</label><input id="ph2" value="${esc(me.name)}"></div><div class="f"><label id="pl">Card number</label><input id="pn" autocomplete="off"></div>
   <div class="note">You can only set this once. Only the last 4 characters are stored.</div><button class="btn" id="spm">Save payment method</button>`}</div>
  <div class="card"><h3>Forex &amp; Display Settings</h3><div class="row"><div class="f"><label>Leverage</label><select id="lev">${[10,30,50,100,200,500].map(l=>`<option ${l===me.leverage?'selected':''} value="${l}">1:${l}</option>`)}</select></div>
   <div class="f"><label>Default lot size</label><input id="dl" type="number" step="0.01" min="0.01" value="${me.lot}"></div></div>
   <div class="row"><div class="f"><label>Account currency</label><select disabled><option>USD</option></select></div><div class="f"><label>Theme</label><select id="th">${['system','light','dark'].map(t=>`<option ${t===me.theme?'selected':''}>${t}</option>`)}</select></div></div>
   <label style="font-size:13px;display:flex;gap:8px;align-items:center;margin-bottom:14px"><input type="checkbox" id="cf" style="width:auto" ${me.confirm?'checked':''}> Confirm orders before execution</label><button class="btn" id="sf">Save settings</button></div></div></div>`;
  $('#avf').onchange=async e=>{try{me=DB.update(me.id,{avatar:await imgToData(e.target.files[0],300)});toast('Photo updated','ok');vSettings()}catch(x){toast(x.message,'err')}};
  $('#sp').onclick=()=>{const email=$('#e').value.trim(),o=DB.byEmail(email);
    if(!/^\S+@\S+\.\S+$/.test(email)||$('#n').value.trim().length<3)return toast('Check name and email','err');if(o&&o.id!==me.id)return toast('Email already in use','err');
    const p={name:$('#n').value.trim(),email,dob:$('#dob').value,country:$('#c').value.trim(),address:$('#ad').value.trim()};
    if(!phoneLocked){const v=$('#ph').value.trim();if(v&&!/^\+?[\d\s()-]{7,18}$/.test(v))return toast('Invalid mobile','err');p.phone=v}
    me=DB.update(me.id,p);toast('Personal information saved','ok');vSettings()};
  if(!pm){const lab={card:'Card number',bank:'IBAN / Account number',crypto:'USDT TRC20 wallet address'};
    $$('[name=pt]').forEach(r=>r.onchange=()=>$('#pl').textContent=lab[r.value]);
    $('#spm').onclick=()=>{try{const t=PaymentAPI.tokenize({type:$('[name=pt]:checked').value,holder:$('#ph2').value.trim(),number:$('#pn').value});
      if(!t.holder)throw new Error('Enter account holder');if(confirm('Payment method cannot be changed after saving. Continue?')){me=DB.update(me.id,{payment:t});toast('Payment method saved','ok');vSettings()}}catch(e){toast(e.message,'err')}}}
  $('#sf').onclick=()=>{const lot=+$('#dl').value;if(!(lot>=.01))return toast('Invalid lot size','err');
    if(+$('#lev').value!==me.leverage&&acct().pos.length)return toast('Close open positions before changing leverage','err');
    me=DB.update(me.id,{leverage:+$('#lev').value,lot,theme:$('#th').value,confirm:$('#cf').checked});localStorage.setItem('afx_themepref',me.theme);applyTheme(me.theme);toast('Settings saved','ok')};
}

/* ---------- Boot ---------- */
(async()=>{await DB.init();const id=DB.session(),u=id&&DB.user(id);u&&u.status!=='suspended'?enter(u.id):authScreen()})();
