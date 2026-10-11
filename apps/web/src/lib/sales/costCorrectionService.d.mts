import type {SaleCostCorrectionRequest,SaleCostCorrectionOutcome,SaleCostCorrectionState} from './saleCostCorrections.mjs';
import type {CostCorrectionJournal,CostCorrectionJournalChange} from './costCorrectionJournal.mjs';
export interface CostCorrectionGateway {ownerId:string|null;subscribe(listener:(owner:string|null)=>void):()=>void;available():Promise<unknown>;read(ids:string[]):Promise<unknown>;history(receiptId:string,lineIndex:number,beforeRevision:string|null):Promise<unknown>;recover(request:SaleCostCorrectionRequest):Promise<unknown>;apply(request:SaleCostCorrectionRequest):Promise<unknown>;cancel(request:SaleCostCorrectionRequest):Promise<unknown>}
export interface CostCorrectionStore {read():Promise<CostCorrectionJournal|null>;change(change:CostCorrectionJournalChange):Promise<CostCorrectionJournal>}
export type CostCorrectionAttempt={status:'applied'|'cancelled'|'unconfirmed'|'empty';journal:CostCorrectionJournal|null;acknowledgement?:SaleCostCorrectionOutcome;code?:string|null;message?:string};
export class CostCorrectionService {
 constructor(options:{gateway:CostCorrectionGateway;store:CostCorrectionStore;newId?:()=>string});readonly ownerId:string;
 onInvalidated(listener:()=>void):()=>void;checkOwner():void;dispose():void;
 available():Promise<boolean>;read(ids:string[]):Promise<SaleCostCorrectionState[]>;history(receiptId:string,lineIndex:number,beforeRevision?:string|null):Promise<SaleCostCorrectionOutcome[]>;journal():Promise<CostCorrectionJournal|null>;
 begin(request:SaleCostCorrectionRequest,expectedLocalRevision:string|null):Promise<CostCorrectionAttempt>;recover():Promise<CostCorrectionAttempt>;retry():Promise<CostCorrectionAttempt>;cancel():Promise<CostCorrectionAttempt>;
}
