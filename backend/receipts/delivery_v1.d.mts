type RpcClient={rpc(name:string,params?:Record<string,unknown>):PromiseLike<{data:unknown;error:unknown}>};
export type DeliveryRow={id:string;receiptId:string;channel:'email'|'sms';destination:string;status:string;createdAt:string;updatedAt:string};
export function receiptDeliveryInput(input:unknown):{requestId:string;receiptId:string;channel:'email'|'sms';destination:string;confirmed:true};
export function receiptSender(options:{env:NodeJS.ProcessEnv;fetchImpl?:typeof fetch}):{capabilities:{email:boolean;sms:boolean};send(job:Record<string,unknown>):Promise<{status:string;failureCode?:string;providerId?:string}>;status(job:Record<string,unknown>):Promise<string|null>};
export function receiptDeliveryService(options:{owner:RpcClient;admin:RpcClient;ownerId:string;sender:ReturnType<typeof receiptSender>}):{
 capabilities():Promise<{email:boolean;sms:boolean}>;send(input:unknown):Promise<DeliveryRow[]>;read(receiptId:string,options?:{refresh?:boolean}):Promise<DeliveryRow[]>;
};
