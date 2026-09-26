import {readBillingWorkerConfig} from './vendor_billing_worker_config_v1.mjs';

// Strict options; private target/ticket values never go on the command line.
export function readBillingOperatorOptions(env,args,operation){
 if(!['CLOSEOUT','RECOVERY'].includes(operation))throw new Error('Invalid billing operation');
 const values=new Map();
 for(const arg of args){
  const match=/^--(apply|request-file|plan-file|out-dir|expected-plan-sha256)(?:=(.+))?$/.exec(arg);
  if(!match||values.has(match[1])||(match[1]==='apply'?match[2]!==undefined:match[2]===undefined))throw new Error('Invalid closeout options');
  values.set(match[1],match[2]??true);
 }
 const apply=values.has('apply');
 if(!values.has('request-file')||!values.has('out-dir'))throw new Error('Private request file and output directory required');
 if(apply!==values.has('plan-file')||apply!==values.has('expected-plan-sha256'))throw new Error('Apply requires reviewed plan and exact hash');
 if(apply&&(env[`GROOKAI_VENDOR_BILLING_${operation}_ENABLED`]!=='true'||env.GROOKAI_VENDOR_BILLING_ENABLED!=='true'))throw new Error('Billing operator apply is disabled');
 const settings=readBillingWorkerConfig(env,['--health']);
 const expected=values.get('expected-plan-sha256');
 if(apply&&(!/^[0-9a-f]{64}$/.test(expected)||env[`GROOKAI_VENDOR_BILLING_${operation}_ACK`]!==expected))throw new Error('Exact operator plan acknowledgement required');
 return {apply,scope:settings.scope,requestFile:values.get('request-file'),outDir:values.get('out-dir'),planFile:values.get('plan-file'),expected};
}
export const readCloseoutOptions=(env,args)=>readBillingOperatorOptions(env,args,'CLOSEOUT');
export function readCloseoutRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='ownerId,requestTicket'||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.ownerId)||
  typeof value.requestTicket!=='string'||value.requestTicket.trim()!==value.requestTicket||value.requestTicket.length<3||value.requestTicket.length>256)throw new Error('Invalid private request');
 return value;
}
export function readRecoveryRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='kind,ownerId,requestTicket,resourceId'||
  !['customer','checkout'].includes(value.kind)||typeof value.resourceId!=='string'||
  !(value.kind==='customer'?/^cus_[A-Za-z0-9]+$/:/^cs_(test_|live_)?[A-Za-z0-9]+$/).test(value.resourceId))throw new Error('Invalid private recovery request');
 readCloseoutRequest({ownerId:value.ownerId,requestTicket:value.requestTicket});return value;
}
