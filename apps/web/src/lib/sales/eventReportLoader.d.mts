import type {EventState,EventHistory} from './vendorEvents.mjs';
import type {RecordedReceipt} from './salesReport.mjs';
import type {CostSnapshot} from './salesProfit.mjs';
import type {SaleCostCorrectionState} from './saleCostCorrections.mjs';
export type EventReportInput={state:EventState;ownerId:string;eventId:string;bookRevision:string;receipts:RecordedReceipt[];snapshots:CostSnapshot[];costBasis?:'original'|'owner_corrected';correctionStates?:SaleCostCorrectionState[]};
export function loadEventReportInput(input:{ownerId:string;eventId:string;readState:(eventId:string)=>Promise<unknown>;readBook:()=>Promise<unknown>;readCosts:(ids:string[])=>Promise<unknown>;checkOwner:()=>void}):Promise<EventReportInput>;
export function loadEventHistory(input:{ownerId:string;eventId:string;beforeRevision?:string|null;limit?:number;readHistory:(eventId:string,beforeRevision:string|null,limit:number)=>Promise<unknown>;checkOwner:()=>void}):Promise<EventHistory>;
export function loadEventCostCorrections(options:{input:EventReportInput;ownerId:string;eventId:string;readCorrections:(ids:string[])=>Promise<unknown>;checkOwner:()=>void}):Promise<EventReportInput>;
