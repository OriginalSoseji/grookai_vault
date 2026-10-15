import type {EventRequest,EventAcknowledgement} from './vendorEvents.mjs';
export type EventRejection='PT409'|'22023'|'42501';
export type EventJournal={version:1;ownerId:string;localRevision:string;pending:EventRequest|null;rejection:EventRejection|null};
export type EventJournalChange={ownerId:string;expectedLocalRevision:string|null;nextLocalRevision:string}&({action:'stage';request:EventRequest}|{action:'acknowledge';request:EventRequest;acknowledgement:EventAcknowledgement}|{action:'reject';request:EventRequest;code:EventRejection}|{action:'discardRejected'});
export function validateEventJournal(value:unknown,ownerId:string):EventJournal|null;
export function changeEventJournal(current:unknown,change:EventJournalChange):EventJournal;
