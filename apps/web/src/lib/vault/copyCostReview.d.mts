import type {CostEvidence} from './copyCost.mjs';
export type CostReviewState='missingAmount'|'missingCurrency'|'needsReview'|'known'|'unavailable';
export type CostReviewRow={readonly instanceId:string;readonly state:CostReviewState;readonly cost:CostEvidence|null};
export function costReviewIds(value:unknown):string[];
export function costReviewRows(ownerId:string,requested:unknown,response:unknown):readonly CostReviewRow[];
export function costReviewLabel(row:CostReviewRow):string;
export function readCostReview(ownerId:string,requested:unknown,options?:{fetcher?:typeof fetch;signal?:AbortSignal;isCurrent?:()=>boolean}):Promise<readonly CostReviewRow[]>;
