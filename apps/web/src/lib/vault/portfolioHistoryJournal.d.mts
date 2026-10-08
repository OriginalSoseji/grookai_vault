import type {PortfolioRequest,PortfolioOutcome} from './portfolioHistory.mjs';
export type PortfolioJournal={version:1;ownerId:string;localRevision:string;pending:PortfolioRequest|null;lastOutcome:PortfolioOutcome|null};
export type PortfolioJournalChange={ownerId:string;expectedLocalRevision:string|null;nextLocalRevision:string}&({action:'stage';request:PortfolioRequest}|{action:'acknowledge';request:PortfolioRequest;acknowledgement:PortfolioOutcome});
export function validatePortfolioJournal(value:unknown,ownerId:string):PortfolioJournal|null;
export function changePortfolioJournal(current:unknown,change:PortfolioJournalChange):PortfolioJournal;
