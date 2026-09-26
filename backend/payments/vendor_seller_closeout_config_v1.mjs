import path from 'node:path';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readSellerCloseoutRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='closeoutId,ownerId,requestTicket'||
  typeof value.ownerId!=='string'||typeof value.closeoutId!=='string'||!uuid.test(value.ownerId)||!uuid.test(value.closeoutId)||typeof value.requestTicket!=='string'||value.requestTicket.trim()!==value.requestTicket||
  value.requestTicket.length<8||value.requestTicket.length>200||/[\r\n\x00-\x1f]/.test(value.requestTicket))throw new Error('Invalid private seller closeout request');
 return value;
}
export function readSellerCloseoutOptions(env,args){
 if(env.GROOKAI_VENDOR_SELLER_CLOSEOUT_ENABLED!=='true')throw new Error('Seller closeout operations disabled');
 const mode=env.STRIPE_PAYMENTS_MODE;
 if(!['test','live'].includes(mode)||env.SUPABASE_URL!==(mode==='test'?'http://127.0.0.1:18821':'https://ycdxbpibncqcchqiihfz.supabase.co'))throw new Error('Seller closeout environment mismatch');
 const options={apply:false};const seen=new Set();
 for(const arg of args){
  const key=arg.split('=')[0];if(seen.has(key))throw new Error('Duplicate seller closeout option');seen.add(key);
  if(arg==='--apply'){options.apply=true;continue;}
  const names={'--request-file':'requestFile','--out-dir':'outDir','--plan-file':'planFile','--expected-plan-sha256':'expected'};
  if(!Object.hasOwn(names,key)||!arg.startsWith(key+'=')||!arg.slice(key.length+1))throw new Error('Unknown seller closeout option');
  options[names[key]]=arg.slice(key.length+1);
 }
 if(!options.requestFile||!options.outDir||!path.isAbsolute(options.requestFile)||!path.isAbsolute(options.outDir))throw new Error('Absolute private request/output paths required');
 if(options.apply){
  if(!options.planFile||!path.isAbsolute(options.planFile)||!/^[0-9a-f]{64}$/.test(options.expected??'')||env.GROOKAI_VENDOR_SELLER_CLOSEOUT_ACK!==options.expected)throw new Error('Exact reviewed seller closeout acknowledgement required');
 }else if(options.planFile||options.expected||env.GROOKAI_VENDOR_SELLER_CLOSEOUT_ACK)throw new Error('Apply options are not planning authority');
 return options;
}
