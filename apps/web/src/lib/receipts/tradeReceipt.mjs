const fields=['description','quantity','valueMinor','rateBps','creditMinor','cardId','printingId','condition','addToVault','printingGvId','instanceId','gvviId'];
const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const check=(ok)=>{if(!ok)throw Error('Invalid trade-in receipt. Preserve the original backup.');};
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s);
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const tradePercentage=n=>(n/100).toFixed(n%100===0?0:2);
export const receiptBalance=r=>r.tradeIn?.balanceMinor??r.totalMinor;

export function validateTradeReceipt(trade,saleTotal){
  check(object(trade)&&Object.keys(trade).length===5&&trade.version===1&&Array.isArray(trade.items)&&trade.items.length>0&&trade.items.length<=50);
  let value=0,credit=0;
  const items=trade.items.map(t=>{
    check(object(t)&&Object.keys(t).length===fields.length&&fields.every(k=>Object.hasOwn(t,k)));
    check(text(t.description,200)&&integer(t.quantity,1,999)&&integer(t.valueMinor,1,100000000)&&integer(t.rateBps,1,10000)&&typeof t.addToVault==='boolean');
    check(t.creditMinor===Math.floor((t.valueMinor*t.quantity*t.rateBps+5000)/10000));
    if(t.cardId===null)check(t.printingId===null&&t.condition===null&&t.printingGvId===null&&t.addToVault===false);
    else check(typeof t.cardId==='string'&&id.test(t.cardId)&&typeof t.printingId==='string'&&id.test(t.printingId)&&t.quantity===1&&['NM','LP','MP','HP','DMG'].includes(t.condition)&&text(t.printingGvId,100));
    if(t.addToVault)check(t.cardId!==null&&typeof t.instanceId==='string'&&id.test(t.instanceId)&&text(t.gvviId,100));
    else check(t.instanceId===null&&t.gvviId===null);
    value+=t.valueMinor*t.quantity;credit+=t.creditMinor;
    return Object.fromEntries(fields.map(k=>[k,t[k]]));
  });
  check(value<=100000000&&credit<=100000000&&trade.totalValueMinor===value&&trade.totalCreditMinor===credit&&trade.balanceMinor===saleTotal-credit);
  return {version:1,items,totalValueMinor:value,totalCreditMinor:credit,balanceMinor:saleTotal-credit};
}

export function tradeReceiptLines(r,money){
  if(!r.tradeIn)return [];
  const t=validateTradeReceipt(r.tradeIn,r.totalMinor);
  return ['TRADE-INS',...t.items.flatMap(i=>[i.description,`${i.quantity} × ${money(i.valueMinor)} × ${tradePercentage(i.rateBps)}% = ${money(i.creditMinor)} credit`]),
    `Total trade credit: ${money(t.totalCreditMinor)}`,
    t.balanceMinor<0?`Paid to customer: ${money(-t.balanceMinor)}`:t.balanceMinor===0?'Even trade · no money due':`Payment received: ${money(t.balanceMinor)}`];
}
