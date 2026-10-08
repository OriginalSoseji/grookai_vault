import type {PortfolioRequest,PortfolioOutcome,PortfolioCapabilities,PortfolioPage,PortfolioSummary,PortfolioComparison} from './portfolioHistory.mjs';
import type {PortfolioJournal,PortfolioJournalChange} from './portfolioHistoryJournal.mjs';
export type PortfolioExport={version:1;ownerId:string;point:PortfolioSummary;rows:Array<{copy:{copyId:string;[key:string]:unknown};evidence:{copyId:string;[key:string]:unknown}}>};
export type PortfolioResolution={status:'empty'|'unconfirmed'|PortfolioOutcome['status'];journal:PortfolioJournal|null;acknowledgement?:PortfolioOutcome;code?:string|null};
export type PortfolioListOptions={before?:string|null;watermark?:string|null;limit?:number};
export interface PortfolioGateway {
 readonly ownerId:string|null;
 subscribe(listener:(owner:string|null)=>void):()=>void;
 capabilities():Promise<unknown>;
 list(options:PortfolioListOptions):Promise<unknown>;
 compare(beforeId:string,afterId:string):Promise<unknown>;
 export(pointId:string,afterCopy:string|null):Promise<unknown>;
 capture(request:PortfolioRequest):Promise<unknown>;
 recover(request:PortfolioRequest):Promise<unknown>;
 cancel(request:PortfolioRequest):Promise<unknown>;
}
export class PortfolioHistoryService {
 constructor(options:{gateway:PortfolioGateway;store:{read():Promise<PortfolioJournal|null>;change(change:PortfolioJournalChange):Promise<PortfolioJournal>};newId?:()=>string});
 readonly ownerId:string;
 checkOwner():void;dispose():void;onInvalidated(listener:()=>void):()=>void;
 capabilities():Promise<PortfolioCapabilities>;journal():Promise<PortfolioJournal|null>;
 list(options?:PortfolioListOptions):Promise<PortfolioPage>;compare(beforeId:string,afterId:string):Promise<PortfolioComparison>;
 begin(day:string,expectedLocalRevision:string|null):Promise<PortfolioResolution>;
 recover():Promise<PortfolioResolution>;retry():Promise<PortfolioResolution>;cancel():Promise<PortfolioResolution>;
 export(pointId:string):Promise<PortfolioExport>;
}
