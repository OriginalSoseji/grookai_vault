import type {SaleCostCorrectionRequest,SaleCostCorrectionOutcome} from './saleCostCorrections.mjs';
export type CostCorrectionJournal={version:1;ownerId:string;localRevision:string;pending:SaleCostCorrectionRequest|null};
export type CostCorrectionJournalChange={ownerId:string;expectedLocalRevision:string|null;nextLocalRevision:string}&({action:'stage';request:SaleCostCorrectionRequest}|{action:'acknowledge';request:SaleCostCorrectionRequest;acknowledgement:SaleCostCorrectionOutcome});
export function validateCostCorrectionJournal(value:unknown,ownerId:string):CostCorrectionJournal|null;
export function changeCostCorrectionJournal(current:unknown,change:CostCorrectionJournalChange):CostCorrectionJournal;
