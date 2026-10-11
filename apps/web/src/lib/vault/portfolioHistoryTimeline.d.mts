import type {PortfolioSummary} from './portfolioHistory.mjs';
export type PortfolioTimelinePoint={snapshotId:string;capturedAt:string;x:number;y:number|null;label:string|null;priced:number;owned:number};
export function portfolioTimeline(points:PortfolioSummary[],currency:string):PortfolioTimelinePoint[];
