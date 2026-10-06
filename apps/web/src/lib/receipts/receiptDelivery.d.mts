export function receiptDeliveryLabel(status:string):string;
export function receiptDeliveryTransport(client:import('@supabase/supabase-js').SupabaseClient,fetchImpl?:typeof fetch):(body?:unknown,receiptId?:string)=>Promise<{capabilities?:{email:boolean;sms:boolean};deliveries?:Array<{id:string;receiptId:string;channel:string;destination:string;status:string}>}>;
