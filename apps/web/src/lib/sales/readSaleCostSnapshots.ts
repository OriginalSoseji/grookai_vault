import type {CostSnapshot} from './salesProfit.mjs';
export async function readSaleCostSnapshots(ownerId:string,receipts:{id:string}[],signal:AbortSignal):Promise<CostSnapshot[]> {
  if(receipts.length>10000)throw Error('This report is too large.');
  const ids=[...new Set(receipts.map(row=>row.id).filter(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)))];
  const snapshots:CostSnapshot[]=[];
  for(let offset=0;offset<ids.length;offset+=100){
    const batch=ids.slice(offset,offset+100),params=new URLSearchParams({owner:ownerId});
    for(const id of batch)params.append('id',id);
    const response=await fetch('/api/sales/costs?'+params,{cache:'no-store',credentials:'same-origin',signal});
    if(!response.ok)throw Error('Private cost history could not load.');
    const body=await response.json();
    if(body.ownerId!==ownerId || !Array.isArray(body.snapshots) || body.snapshots.length>batch.length ||
      body.snapshots.some((row:CostSnapshot)=>!row || !batch.includes(row.receiptId)) ||
      new Set(body.snapshots.map((row:CostSnapshot)=>row.receiptId)).size!==body.snapshots.length)throw Error('Private cost history needs review.');
    snapshots.push(...body.snapshots);
  }
  return snapshots;
}
