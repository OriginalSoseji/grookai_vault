import type {Buffer} from 'node:buffer';
export type SquareWebhookHint = {environment:'sandbox'|'production';eventId:string;merchantId:string;type:'order'|'payment'|'refund'|'inventory'|'authorization';resourceId:string;bodyHash:string};
export function squareWebhookHint(input:{body:Buffer;signature:string|null;key:string;notificationUrl:string;environment:string|undefined}):SquareWebhookHint|null;
