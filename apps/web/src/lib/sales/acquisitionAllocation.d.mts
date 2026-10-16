export function equalSplit(totalMinor:number,count:number):number[];
export function weightedSplit(totalMinor:number,weights:number[]):number[];
export function allocationPreview(totalMinor:number,lines:readonly {referenceMinor?:number|null;allocatedMinor?:number|null}[],mode?:'equal_split'|'weighted_reference'|'manual'):number[];
