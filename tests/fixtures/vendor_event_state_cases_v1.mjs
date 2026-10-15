export const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',eventId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',receiptId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const stamp='2026-10-08T13:00:00.123456+00:00';
const state={version:1,ownerId:owner,revision:'9007199254740993',entryEnabled:true,receiptAccess:true,
 events:[{eventId,name:'Card show',startDate:'2026-11-01',endDate:'2026-11-02',timeZone:'America/Havana',currency:'USD',notes:'',status:'open',stateReason:'',revision:'9007199254740992',createdAt:stamp,updatedAt:stamp}],
 selected:{eventId,expenses:[{expenseId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',eventId,category:'booth',description:'Booth fee',amountMinor:'1000',currency:'USD',incurredOn:'2026-11-01',voided:false,lastReason:'',revision:'9007199254740993',createdAt:stamp,updatedAt:stamp}],
 assignments:[{receiptId,eventId,revision:'2'}],candidates:[{receiptId,localDate:'2026-11-01',previousEventId:eventId}],receiptIdentityConflicts:[],bookRevision:'1'}};
export const cases=[];
function add(name,valid,edit=()=>{},selectedId=eventId,ownerId=owner){const value=structuredClone(state);edit(value);cases.push({name,valid,value,selectedId,ownerId});}
add('selected event with precise large revision',true);
add('list without selected detail',true,v=>v.selected=null,null);
add('empty owner does not need state row',true,v=>{v.events=[];v.selected=null;v.revision='0';v.entryEnabled=false;v.receiptAccess=false;},null);
add('entry off retains reads',true,v=>v.entryEnabled=false);
add('cloud off retains association metadata',true,v=>{v.entryEnabled=false;v.receiptAccess=false;v.selected.candidates=null;v.selected.bookRevision=null;});
add('void retains expense and reason',true,v=>{v.selected.expenses[0].voided=true;v.selected.expenses[0].lastReason='Duplicate';});
add('closed state has reason',true,v=>{v.events[0].status='closed';v.events[0].stateReason='Show complete';});
add('ambiguous identity excluded from candidates',true,v=>{v.selected.receiptIdentityConflicts=[receiptId];v.selected.candidates=[];});
add('unassigned candidate',true,v=>{v.selected.assignments[0].eventId=null;v.selected.candidates[0].previousEventId=null;});
add('submillisecond timestamp order',true,v=>v.events[0].updatedAt='2026-10-08T13:00:00.123457+00:00');
for(const [name,edit] of [
 ['unknown response field',v=>v.owner='extra'],['wrong version',v=>v.version=2],['numeric revision',v=>v.revision=2],
 ['revision overflow',v=>v.revision='9223372036854775808'],['row newer than owner',v=>v.events[0].revision='9007199254740994'],['zero row revision',v=>v.events[0].revision='0'],
 ['entry without receipt access',v=>v.receiptAccess=false],['string switch',v=>v.entryEnabled='true'],
 ['duplicate events',v=>v.events.push(structuredClone(v.events[0]))],['events out of order',v=>{const next=structuredClone(v.events[0]);next.eventId=receiptId;v.events.unshift(next);}],
 ['unsupported event state',v=>v.events[0].status='deleted'],['closed without reason',v=>v.events[0].status='closed'],
 ['unknown event metadata',v=>v.events[0].extra=true],['invalid event dates',v=>v.events[0].startDate='2026-02-30'],
 ['malformed timestamp',v=>v.events[0].createdAt='yesterday'],['update before create',v=>v.events[0].updatedAt='2020-01-01T00:00:00Z'],
 ['submillisecond backwards timestamp',v=>v.events[0].updatedAt='2026-10-08T13:00:00.123455+00:00'],
 ['overflow timestamp time',v=>v.events[0].updatedAt='2026-10-08T25:00:00.000000Z'],
 ['overflow timestamp date',v=>v.events[0].updatedAt='2027-02-30T13:00:00.000000Z'],
 ['overflow timestamp offset',v=>v.events[0].updatedAt='2027-02-01T13:00:00.000000+99:99'],
 ['missing selection',v=>v.selected=null],['wrong selected identity',v=>v.selected.eventId=receiptId],['missing selected event',v=>v.events=[]],
 ['duplicate expense',v=>v.selected.expenses.push(structuredClone(v.selected.expenses[0]))],['foreign expense event',v=>v.selected.expenses[0].eventId=receiptId],
 ['numeric expense amount',v=>v.selected.expenses[0].amountMinor=1000],['void without reason',v=>v.selected.expenses[0].voided=true],['string void state',v=>v.selected.expenses[0].voided='false'],
 ['duplicate assignment',v=>v.selected.assignments.push(structuredClone(v.selected.assignments[0]))],['unknown assignment event',v=>v.selected.assignments[0].eventId=receiptId],
 ['candidate disagrees with assignment',v=>v.selected.candidates[0].previousEventId=null],['candidate outside dates',v=>v.selected.candidates[0].localDate='2026-11-03'],
 ['ambiguous candidate',v=>v.selected.receiptIdentityConflicts=[receiptId]],['duplicate conflicts',v=>v.selected.receiptIdentityConflicts=[receiptId,receiptId]],
 ['numeric book revision',v=>v.selected.bookRevision=1],['missing accessible candidates',v=>v.selected.candidates=null],['null accessible book revision',v=>v.selected.bookRevision=null],
 ['cloud off exposes candidates',v=>{v.entryEnabled=false;v.receiptAccess=false;}],['cloud off exposes conflicts',v=>{v.entryEnabled=false;v.receiptAccess=false;v.selected.candidates=null;v.selected.bookRevision=null;v.selected.receiptIdentityConflicts=[receiptId];}],
 ['unknown candidate field',v=>v.selected.candidates[0].amount=1],
])add(name,false,edit);
add('wrong account',false,()=>{},eventId,receiptId);
add('unexpected selection in list',false,()=>{},null);
