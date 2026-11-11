import type {SquareWebhookHint} from './webhook_v2.mjs';
export function recordSquareWebhookSignal(hint:SquareWebhookHint):Promise<boolean>;
export function processSquareWebhookSignal(hint:SquareWebhookHint):Promise<void>;
