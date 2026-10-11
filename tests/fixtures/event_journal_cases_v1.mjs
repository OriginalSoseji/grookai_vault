import fs from 'node:fs';
const vectors=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/vendor_events_v1.json',import.meta.url)));
export const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
export const request=structuredClone(vectors.requestCases[0].request);
export const ack={version:1,ownerId:owner,requestId:request.requestId,previousRevision:'0',revision:'1',operation:structuredClone(request.operation)};
export const pending={version:1,ownerId:owner,localRevision:first,pending:request,rejection:null};
const cleared={...pending,localRevision:second,pending:null,rejection:null};
const change=(action,extra={})=>({ownerId:owner,expectedLocalRevision:first,nextLocalRevision:second,action,...extra});
export const cases=[];
function add(name,current,edit,expected,valid=true){cases.push({name,current:structuredClone(current),change:structuredClone(edit),expected:structuredClone(expected),valid});}
add('stage freezes exact wire request',null,change('stage',{expectedLocalRevision:null,request}),{...pending,localRevision:second});
add('acknowledgement clears only verified request',pending,change('acknowledge',{request,acknowledgement:ack}),cleared);
for(const code of ['PT409','22023','42501'])add('definitive refusal '+code,pending,change('reject',{request,code}),{...pending,localRevision:second,rejection:code});
add('explicitly discard a recorded refusal',{...pending,rejection:'PT409'},change('discardRejected'),cleared);
add('retry acknowledgement can settle rejected request',{...pending,rejection:'42501'},change('acknowledge',{request,acknowledgement:ack}),cleared);
const invalid=[
 ['cannot overwrite pending',pending,change('stage',{request})],
 ['cannot discard uncertain request',pending,change('discardRejected')],
 ['transport failure is not rejection',pending,change('reject',{request,code:'NETWORK'})],
 ['auth expiry is not final rejection',pending,change('reject',{request,code:'28000'})],
 ['stale editor revision',pending,change('reject',{request,code:'PT409',expectedLocalRevision:null})],
 ['revision cannot repeat',pending,change('reject',{request,code:'PT409',nextLocalRevision:first})],
 ['foreign account',pending,change('reject',{request,code:'PT409',ownerId:second})],
 ['changed request cannot settle',pending,change('acknowledge',{request:{...request,expectedRevision:'1'},acknowledgement:ack})],
 ['wrong acknowledgement owner',pending,change('acknowledge',{request,acknowledgement:{...ack,ownerId:second}})],
 ['wrong acknowledgement revision',pending,change('acknowledge',{request,acknowledgement:{...ack,revision:'2'}})],
 ['absent request cannot acknowledge',null,change('acknowledge',{expectedLocalRevision:null,request,acknowledgement:ack})],
 ['unknown action',pending,change('delete')],
 ['corrupt journal version',{...pending,version:2},change('discardRejected')],
 ['extra journal fields',{...pending,extra:true},change('discardRejected')],
 ['refusal without request',{...pending,pending:null,rejection:'PT409'},change('discardRejected')],
];
for(const [name,current,edit]of invalid)add(name,current,edit,null,false);
