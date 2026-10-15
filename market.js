/* Simulated live FX market: 28 forex pairs + metals/crypto. Replace tick() with a real price feed (WebSocket) for live data. */
const Market=(()=>{
  const raw=`EURUSD 1.0850|GBPUSD 1.2700|AUDUSD 0.6600|NZDUSD 0.6100|USDJPY 150.20|USDCAD 1.3600|USDCHF 0.8850|
EURGBP 0.8540|EURJPY 163.00|EURCHF 0.9600|EURAUD 1.6440|EURCAD 1.4760|EURNZD 1.7790|GBPJPY 190.80|GBPCHF 1.1240|GBPAUD 1.9250|GBPCAD 1.7270|GBPNZD 2.0820|
AUDJPY 99.10|AUDCHF 0.5840|AUDCAD 0.8980|AUDNZD 1.0820|NZDJPY 91.60|NZDCHF 0.5400|NZDCAD 0.8300|CADJPY 110.40|CADCHF 0.6510|CHFJPY 169.70|XAUUSD 2350.00|XAGUSD 28.50|BTCUSD 67000|ETHUSD 3300`;
  const list=[],meta={},mid={},candles={},cbs=[];
  raw.replace(/\n/g,'').split('|').forEach(x=>{
    const [s,p]=x.trim().split(' ');if(!s)return;const jpy=s.endsWith('JPY'),cr=/^(BTC|ETH)/.test(s),mt=/^XA/.test(s);
    meta[s]={s,base:s.slice(0,3),quote:s.slice(3),d:jpy?3:(cr||mt)?2:5,pip:jpy?.01:cr?1:mt?.1:.0001,
      contract:s==='XAUUSD'?100:s==='XAGUSD'?5000:cr?1:100000,spread:(jpy?1.5:cr?20:mt?3:1.2),vol:cr?6e-4:mt?2.5e-4:1.3e-4,
      cat:cr?'Crypto':mt?'Metals':/USD/.test(s)?'Majors':'Crosses'};
    mid[s]=+p;list.push(s);candles[s]=[];
    // seed history (candle = 5 ticks)
    let v=+p;const hist=[];for(let i=0;i<90;i++){const o=v;let h=o,l=o;for(let k=0;k<5;k++){v+=(Math.random()-.5)*2*meta[s].vol*v;h=Math.max(h,v);l=Math.min(l,v)}hist.push({o,h,l,c:v,n:5})}
    const k=+p/v;hist.forEach(c=>{c.o*=k;c.h*=k;c.l*=k;c.c*=k});candles[s]=hist;
  });
  const half=s=>meta[s].spread*meta[s].pip/2;
  const px=(s,side)=>side==='ask'?mid[s]+half(s):mid[s]-half(s);
  const usdPer=c=>c==='USD'?1:mid[c+'USD']?mid[c+'USD']:mid['USD'+c]?1/mid['USD'+c]:1;
  const pnl=(p,exit)=>{const m=meta[p.sym];return (exit-p.entry)*p.dir*m.contract*p.lots*usdPer(m.quote)};
  const marginFor=(s,lots,lev)=>lots*meta[s].contract*usdPer(meta[s].base)/lev;
  function tick(){
    list.forEach(s=>{
      const m=meta[s];mid[s]=Math.max(m.pip*10,mid[s]*(1+(Math.random()-.5)*2*m.vol));
      const a=candles[s],c=a[a.length-1];c.c=mid[s];c.h=Math.max(c.h,mid[s]);c.l=Math.min(c.l,mid[s]);c.n++;
      if(c.n>=5){a.push({o:mid[s],h:mid[s],l:mid[s],c:mid[s],n:0});if(a.length>120)a.shift()}
    });
    cbs.forEach(f=>f());
  }
  let timer;const start=()=>{if(!timer)timer=setInterval(tick,1000)};
  return {list,meta,mid,candles,px,pnl,usdPer,marginFor,start,on:f=>cbs.push(f),off:f=>{const i=cbs.indexOf(f);if(i>=0)cbs.splice(i,1)}};
})();

/* Canvas candlestick / line chart */
function drawChart(cv,sym,type){
  const a=Market.candles[sym].slice(-70),m=Market.meta[sym],dpr=devicePixelRatio||1;
  const w=cv.clientWidth,h=cv.clientHeight;if(!w)return;cv.width=w*dpr;cv.height=h*dpr;
  const g=cv.getContext('2d');g.scale(dpr,dpr);const st=getComputedStyle(document.documentElement);
  const grid=st.getPropertyValue('--line').trim(),mut=st.getPropertyValue('--muted').trim(),up=st.getPropertyValue('--up').trim(),dn=st.getPropertyValue('--down').trim(),gold=st.getPropertyValue('--gold').trim();
  const pr=58,pb=18;let hi=Math.max(...a.map(c=>c.h)),lo=Math.min(...a.map(c=>c.l));const pad=(hi-lo)*.1||m.pip;hi+=pad;lo-=pad;
  const Y=v=>(h-pb)-(v-lo)/(hi-lo)*(h-pb-6)-0,bw=(w-pr)/a.length;
  g.font='10px JetBrains Mono, monospace';g.textAlign='left';
  for(let i=0;i<=5;i++){const v=lo+(hi-lo)*i/5,y=Y(v);g.strokeStyle=grid;g.beginPath();g.moveTo(0,y);g.lineTo(w-pr,y);g.stroke();g.fillStyle=mut;g.fillText(v.toFixed(m.d),w-pr+6,y+3)}
  if(type==='line'){
    g.beginPath();a.forEach((c,i)=>{const x=i*bw+bw/2;i?g.lineTo(x,Y(c.c)):g.moveTo(x,Y(c.c))});g.strokeStyle=gold;g.lineWidth=2;g.stroke();
    g.lineTo((a.length-.5)*bw,h-pb);g.lineTo(bw/2,h-pb);const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,gold+'55');gr.addColorStop(1,gold+'00');g.fillStyle=gr;g.fill();
  }else a.forEach((c,i)=>{const x=i*bw+bw/2,col=c.c>=c.o?up:dn;g.strokeStyle=g.fillStyle=col;g.lineWidth=1;
    g.beginPath();g.moveTo(x,Y(c.h));g.lineTo(x,Y(c.l));g.stroke();const t=Y(Math.max(c.o,c.c)),b=Math.max(1,Math.abs(Y(c.o)-Y(c.c)));g.fillRect(x-bw*.32,t,bw*.64,b)});
  const y=Y(Market.mid[sym]);g.setLineDash([4,3]);g.strokeStyle=gold;g.beginPath();g.moveTo(0,y);g.lineTo(w-pr,y);g.stroke();g.setLineDash([]);
  g.fillStyle=gold;g.fillRect(w-pr,y-8,pr,16);g.fillStyle='#111';g.fillText(Market.mid[sym].toFixed(m.d),w-pr+4,y+3);
}
