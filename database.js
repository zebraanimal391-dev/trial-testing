/* AuraFX core: storage, helpers, theme. Swap localStorage calls for a real backend API in production. */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=async t=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))].map(b=>b.toString(16).padStart(2,'0')).join('');
const L=(k,d)=>{try{return JSON.parse(localStorage.getItem('afx_'+k))??d}catch{return d}};
const S=(k,v)=>localStorage.setItem('afx_'+k,JSON.stringify(v));
const money=n=>(n<0?'-':'')+'$'+Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const DB={
  users:()=>L('users',[]), saveUsers:u=>S('users',u),
  user:id=>DB.users().find(u=>u.id===id),
  byEmail:e=>DB.users().find(u=>u.email.toLowerCase()===e.toLowerCase()),
  add(u){const a=DB.users();a.push(u);DB.saveUsers(a);return u},
  update(id,p){const a=DB.users(),i=a.findIndex(x=>x.id===id);if(i<0)return;a[i]={...a[i],...p};DB.saveUsers(a);return a[i]},
  positions:()=>L('pos',[]), savePos:p=>S('pos',p),
  history:()=>L('hist',[]), saveHist:h=>S('hist',h),
  tx:()=>L('tx',[]), addTx(t){const a=DB.tx();a.unshift(t);S('tx',a)},
  notes:()=>L('notes',[]), addNote(uid,text){const a=DB.notes();a.unshift({uid,text,t:Date.now(),read:false});S('notes',a)},
  session:()=>L('session',null),
  async init(){
    if(!L('admin')) S('admin',{username:'Marcus',hash:await hash('Marcus 1234')});
    if(!L('seeded')){S('seeded',1)}
  }
};

/* Theme: 'light' | 'dark' | 'system' */
function applyTheme(pref='system'){
  const dark=pref==='dark'||(pref==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=dark?'dark':'light';
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>applyTheme(localStorage.getItem('afx_themepref')||'system'));
applyTheme(localStorage.getItem('afx_themepref')||'system');

function toast(msg,type=''){
  let c=$('#toasts');if(!c){c=document.createElement('div');c.id='toasts';document.body.appendChild(c)}
  const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;c.appendChild(t);setTimeout(()=>t.remove(),5000);
}
function imgToData(file,max=600){
  return new Promise((res,rej)=>{
    if(!file||!file.type.startsWith('image/'))return rej(new Error('Please choose an image file'));
    const r=new FileReader();r.onerror=rej;
    r.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{
      const k=Math.min(1,max/Math.max(im.width,im.height));const c=document.createElement('canvas');
      c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.8))};im.src=r.result};
    r.readAsDataURL(file);
  });
}
const initials=n=>(n||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
const avatar=(u,cls='')=>u.avatar?`<img class="av ${cls}" src="${u.avatar}" alt="">`:`<span class="av ${cls}">${esc(initials(u.name))}</span>`;
