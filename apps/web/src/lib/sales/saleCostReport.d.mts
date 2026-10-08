import type {RecordedReceipt} from './salesReport.mjs';
import type {CostSnapshot} from './salesProfit.mjs';
import type {SaleCostCorrectionState} from './saleCostCorrections.mjs';
export function saleCostReportCsv(receipts:RecordedReceipt[],snapshots:CostSnapshot[],options?:{basis?:'original'|'owner_corrected';states?:SaleCostCorrectionState[];ownerId?:string}):string;
