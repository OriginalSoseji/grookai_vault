import type {EventOperation,EventRequest,EventAcknowledgement,EventState} from './vendorEvents.mjs';
import type {EventJournal,EventJournalChange,EventRejection} from './eventJournal.mjs';
export interface EventGateway {readonly ownerId:string|null;subscribe(listener:(owner:string|null)=>void):()=>void;read(eventId:string|null):Promise<unknown>;recover(requestId:string):Promise<unknown>;mutate(request:EventRequest):Promise<unknown>}
export interface EventStore {read():Promise<EventJournal|null>;change(change:EventJournalChange):Promise<EventJournal>}
export type EventAttempt={status:'saved';journal:EventJournal;acknowledgement:EventAcknowledgement}|{status:'unconfirmed';journal:EventJournal;message:string}|{status:'rejected';journal:EventJournal;code:EventRejection}|{status:'empty';journal:EventJournal|null};
export class EventRpcError extends Error {constructor(code:string|null,definitive?:boolean);code:string|null;definitive:boolean}
export class EventService {
 constructor(options:{gateway:EventGateway;store:EventStore;newId?:()=>string});
 readonly ownerId:string;
 onInvalidated(listener:()=>void):()=>void;
 checkOwner():void;dispose():void;
 read(eventId?:string|null):Promise<EventState>;
 journal():Promise<EventJournal|null>;
 begin(operation:EventOperation,expectedRevision:string,expectedLocalRevision:string|null):Promise<EventAttempt>;
 recover(sendIfMissing?:boolean):Promise<EventAttempt>;
 discardRejected(expectedLocalRevision:string):Promise<EventJournal>;
}
