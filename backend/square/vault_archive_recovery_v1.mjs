const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/;
export function squareArchiveRecoveryTarget(error){
 if(error?.code!=='55000'||error.message!=='square_stock_reserved'||typeof error.details!=='string'||error.details.length>2048)return null;
 try{
  const value=JSON.parse(error.details);
  return value?.kind==='square_vault_removal_v1'&&uuid.test(value.instanceId)&&/^GVVI-[A-Z0-9]{6,12}-[0-9]{6}$/.test(value.gvvi)
   ?{instanceId:value.instanceId,gvvi:value.gvvi}:null;
 }catch{return null;}
}
export async function squareAwareVaultArchive({archive,prepare}){
 const prepared=new Set();
 for(let attempt=0;attempt<=1000;attempt++){
  const result=await archive();
  if(!result.error)return result;
  const target=squareArchiveRecoveryTarget(result.error);
  if(!target)return result;
  if(prepared.has(target.instanceId))return {...result,error:{...result.error,message:'square_removal_unconfirmed'}};
  prepared.add(target.instanceId);
  // Only a definite database rollback may replay the existing owner writer.
  // An uncertain provider/transport result rejects here and never retries it.
  const receipt=await prepare(target.instanceId);
  if(receipt?.status!=='ready_to_archive'||receipt.instanceId!==target.instanceId||receipt.gvvi!==target.gvvi){
   return {...result,error:{...result.error,message:'square_removal_unconfirmed'}};
  }
 }
 return {data:null,error:{code:'55000',message:'square_removal_too_many'}};
}
