import {discountRequest} from './discounted_sale_cases_v1.mjs';
const {version,...cart}=structuredClone(discountRequest.cart);
export const discountDraft={...cart,id:'d3000000-0000-4000-8000-000000000001',kind:'discounted-sale',label:'Saved buyer',trades:[],method:'Cash'};
function row(name,change,draftValid=true,requestValid=false){const draft=structuredClone(discountDraft);change?.(draft);return{name,draftValid,requestValid,draft};}
export const discountedDraftCases=[
 row('explicit split survives draft',null,true,true),
 row('single method produces explicit payment',d=>{delete d.payments;},true,true),
 row('empty draft is editable',d=>{d.items=[];d.discountMinor=0;delete d.payments;}),
 row('zero discount retains new kind',d=>{d.discountMinor=0;delete d.payments;},true,true),
 row('full discount with tax',d=>{d.discountMinor=200;delete d.payments;},true,true),
 row('changed discount retains original split for review',d=>{d.discountMinor=21;}),
 row('removed line retains discount for review',d=>{d.items=[];}),
 row('discount greater than subtotal remains editable',d=>{d.discountMinor=201;delete d.payments;}),
 row('tax exceeding receipt total stays editable',d=>{d.taxMinor=100000000;delete d.payments;}),
 row('contact can remain incomplete during editing',d=>{d.customer.email='typing';}),
 row('store can remain empty during editing',d=>{d.storeName='';}),
 row('private note allows500 characters',d=>{d.note='x'.repeat(500);},true,true),
 row('no incoming trade allowed',d=>{d.trades=[{description:'Incoming',quantity:1,valueMinor:20,rateBps:10000}];},false),
 row('negative discount rejected',d=>{d.discountMinor=-1;},false),
 row('fractional discount rejected',d=>{d.discountMinor=0.1;},false),
 row('text discount rejected',d=>{d.discountMinor='20';},false),
 row('excess gross rejected',d=>{d.items[0].unitMinor=100000000;},false),
 row('unknown field cannot disappear',d=>{d.future='unknown';},false),
 row('legacy kind does not imply discount',d=>{delete d.kind;},false),
 row('unsupported line metadata rejected',d=>{d.items[0].privateCost=10;},false),
 row('duplicate copy regardless of case',d=>{d.items[1]={...d.items[0],instanceId:d.items[0].instanceId.toUpperCase()};},false),
 row('copy quantity must be one',d=>{d.items[0].quantity=2;},false),
 row('missing customer field',d=>{delete d.customer.notes;},false),
 row('payment extras rejected',d=>{d.payments[0].extra=1;},false),
];
