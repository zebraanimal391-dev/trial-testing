/* Payment API layer. Set PaymentAPI.live=true and point `endpoint` at YOUR backend (which talks to Stripe/Paystack/Flutterwave/Coinbase Commerce).
   Never put secret keys in browser code. In demo mode payments are simulated locally. */
const PaymentAPI={
  live:false, endpoint:'/api/payments',
  methods:[{id:'card',name:'Credit / Debit Card',hint:'Card number'},{id:'bank',name:'Bank Transfer',hint:'IBAN / Account number'},{id:'crypto',name:'Crypto (USDT TRC20)',hint:'Wallet address'}],
  luhn(n){n=n.replace(/\D/g,'');if(n.length<13)return false;let s=0,d=false;for(let i=n.length-1;i>=0;i--){let x=+n[i];if(d){x*=2;if(x>9)x-=9}s+=x;d=!d}return s%10===0},
  /* Only masked data is ever stored */
  tokenize({type,holder,number}){
    const clean=number.replace(/\s/g,'');
    if(type==='card'&&!this.luhn(clean))throw new Error('Invalid card number');
    if(clean.length<8)throw new Error('Enter a valid account / wallet identifier');
    return {type,holder,masked:'••••'+clean.slice(-4),added:Date.now()};
  },
  async request(path,body){
    if(this.live){const r=await fetch(this.endpoint+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Payment provider error');return r.json()}
    await sleep(1400);return {ref:'AFX'+Date.now().toString(36).toUpperCase(),status:'succeeded'};
  },
  deposit(o){if(!(o.amount>=10))throw new Error('Minimum deposit is $10');return this.request('/deposit',o)},
  withdraw(o){if(!(o.amount>=10))throw new Error('Minimum withdrawal is $10');return this.request('/withdraw',o)}
};
