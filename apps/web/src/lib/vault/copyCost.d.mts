export type CostEvidence = {amount:string|null;currency:string|null;minor:string|null;status:string};
export type CostRequest = {ownerId:string;requestId:string;instanceId:string;expectedAmount:string|null;expectedCurrency:string|null;amount:string|null;currency:string|null};
export function isCostId(value:unknown):value is string;
export function parseCopyCost(amountInput:string,currencyInput:string):{amount:string|null;currency:string|null;minor:string|null};
export function validateCostRequest(value:unknown):CostRequest;
export function isCostEvidence(value:unknown):value is CostEvidence;
export function confirmedCostResult(result:unknown,request:CostRequest):boolean;
export function costStatusLabel(cost:CostEvidence|null):string;
