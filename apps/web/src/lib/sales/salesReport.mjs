// Vendor-recorded receipts only. This is not a processor settlement/profit report.
export function salesReport(receipts,{start,end,query='',method='',hour=d=>d.getHours()}) {
 const seen=new Set(),rows=[],hours=Array.from({length:24},()=>({sales:0,transactions:0})),payments={};
 let sales=0,tax=0,received=0,paid=0,credit=0,units=0;
 if(!Number.isFinite(+start)||!Number.isFinite(+end)||+end<=+start)throw Error('Choose a valid date range.');
 for(const r of receipts){
  if(seen.has(r.id))continue;seen.add(r.id);const date=new Date(r.createdAt);
  if(!Number.isFinite(+date)||date<start||date>=end||method&&r.method!==method)continue;
  const text=[r.number,r.customerName,...r.items.map(i=>i.description),...(r.tradeIn?.items??[]).map(i=>i.description)].join(' ').toLowerCase();
  if(!text.includes(query.trim().toLowerCase()))continue;
  const net=r.subtotalMinor-(r.discountMinor??0),balance=r.tradeIn?.balanceMinor??r.totalMinor;
  rows.push(r);sales+=net;tax+=r.taxMinor;received+=Math.max(balance,0);paid+=Math.max(-balance,0);credit+=r.tradeIn?.totalCreditMinor??0;units+=r.items.reduce((n,i)=>n+i.quantity,0);
  const h=hour(date);hours[h].sales+=net;hours[h].transactions++;payments[r.method]=(payments[r.method]??0)+balance;
 }
 rows.sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt));
 return {rows,hours,payments,sales,tax,received,paid,credit,units,transactions:rows.length,average:rows.length?Math.round(sales/rows.length):0};
}
export function reportCsv(rows){
 const cell=v=>{let text=String(v??'');if(/^\s*[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 return ['Receipt,Recorded at,Customer,Method,Units,Sales USD,Tax USD,Trade credit USD,Received USD,Paid to customer USD',...rows.map(r=>{
  const balance=r.tradeIn?.balanceMinor??r.totalMinor;
  return [r.number,r.createdAt,r.customerName,r.method,r.items.reduce((n,i)=>n+i.quantity,0),((r.subtotalMinor-(r.discountMinor??0))/100).toFixed(2),(r.taxMinor/100).toFixed(2),((r.tradeIn?.totalCreditMinor??0)/100).toFixed(2),(Math.max(balance,0)/100).toFixed(2),(Math.max(-balance,0)/100).toFixed(2)].map(cell).join(',');
 })].join('\r\n');
}
