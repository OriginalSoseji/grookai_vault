import {owner,request} from './event_journal_cases_v1.mjs';
const eventId=request.operation.eventId,other='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const history={version:1,ownerId:owner,eventId,rows:[{requestId:request.requestId,revision:'9007199254740993',createdAt:'2026-10-08T13:00:00.123456+00:00',operation:request.operation,before:[],after:[{owner_id:owner,revision:9007199254740992}]},{requestId:other,revision:'1',createdAt:'2026-10-08T12:00:00Z',operation:{type:'event_close',eventId,reason:'Closed'},before:[],after:[]}],nextRevision:'1'};
export const cases=[];
function add(name,valid,edit=()=>{},beforeRevision=null,limit=2){const value=structuredClone(history);edit(value);cases.push({name,valid,value,ownerId:owner,eventId,beforeRevision,limit,expected:valid?{version:1,ownerId:owner,eventId,rows:value.rows.map(({requestId,revision,createdAt,operation})=>({requestId,revision,createdAt,operation})),nextRevision:value.nextRevision}:null});}
add('display projection keeps exact outer revision and omits raw numeric row revisions',true);
add('last history page',true,v=>v.nextRevision=null);
add('empty history page',true,v=>{v.rows=[];v.nextRevision=null;});
add('reassignment appears in the previous event history',true,v=>v.rows[0].operation={type:'receipts_assign',eventId:other,receipts:[{receiptId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',previousEventId:eventId}]});
add('bounded earlier page',true,()=>{},'9223372036854775807');
for(const [name,edit]of [
 ['wrong account',v=>v.ownerId=other],['wrong event',v=>v.eventId=other],['unknown field',v=>v.extra=true],
 ['duplicate request IDs',v=>v.rows[1].requestId=v.rows[0].requestId],['duplicate revisions',v=>v.rows[1].revision=v.rows[0].revision],['ascending revisions',v=>v.rows.reverse()],
 ['numeric revision',v=>v.rows[0].revision=2],['zero revision',v=>v.rows[1].revision='0'],['invalid date',v=>v.rows[0].createdAt='yesterday'],
 ['unrelated operation',v=>v.rows[0].operation.eventId=other],['unknown operation',v=>v.rows[0].operation.type='delete_event'],
 ['foreign audit state',v=>v.rows[0].after[0].owner_id=other],['malformed audit state',v=>v.rows[0].after=[null]],['oversized change array',v=>v.rows[0].after=Array.from({length:101},()=>({}))],
 ['wrong next cursor',v=>v.nextRevision='2'],['next cursor on short page',v=>v.rows.pop()],
])add(name,false,edit);
add('noncanonical cursor',false,()=>{},'01');add('page includes cursor revision',false,()=>{},'9007199254740993');add('unsupported page size',false,()=>{},null,0);
