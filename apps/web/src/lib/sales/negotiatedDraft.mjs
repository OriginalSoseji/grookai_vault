// Negotiated entry preserves explicit agreements and legacy journal semantics.
import {validateNegotiatedTradeLine, negotiatedTradeTotals, validateNegotiatedTradeRequest} from './negotiatedTrade.mjs';
import {tenderMethods, paymentSnapshot, paymentMethod} from './salesPayments.mjs';
const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const text = (v,n) => typeof v === 'string' && v.length <= n;
const integer = (v,a,b) => Number.isSafeInteger(v) && v >= a && v <= b;
const fields = ['kind','id','label','storeName','items','trades','taxMinor','method','note','customerId','customer'];
const check = v => {if (!v) throw Error('Saved trade needs review. Preserve this browser data.');};
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const isNegotiatedDraft = v => v?.kind === 'negotiated-trade';
function amounts(draft) {
    const subtotal = draft.items.reduce((sum,line) => sum + line.quantity * line.unitMinor,0);
    const credit = draft.trades.reduce((sum,line) => sum + line.creditMinor,0);
    return {subtotal,credit,total:subtotal + draft.taxMinor,balance:subtotal + draft.taxMinor - credit};
}
// Editing permits incomplete contacts/payment allocation, while reviewed line terms stay exact.
export function validateNegotiatedDraft(value) {
    check(object(value) && isNegotiatedDraft(value) && fields.every(k => Object.hasOwn(value,k)) &&
        Object.keys(value).every(k => [...fields,'payments'].includes(k)) && uuid(value.id) &&
        text(value.label,120) && text(value.storeName,120) && text(value.note,350) &&
        integer(value.taxMinor,0,100000000) && tenderMethods.includes(value.method) &&
        (value.customerId === null || uuid(value.customerId)) && Array.isArray(value.items) && value.items.length <= 50 &&
        Array.isArray(value.trades) && value.trades.length <= 50);
    const limits = {name:120,email:254,phone:40,wants:1000,notes:2000};
    check(object(value.customer) && Object.keys(value.customer).length === 5 &&
        Object.entries(limits).every(([k,max]) => text(value.customer[k],max)));
    const seen = new Set();
    for (const line of value.items) {
        check(object(line) && Object.keys(line).every(k => ['instanceId','gvviId','description','quantity','unitMinor','askingMinor','image'].includes(k)) &&
            text(line.description,200) && line.description.trim() && integer(line.quantity,1,999) && integer(line.unitMinor,1,100000000));
        if (line.instanceId != null) {
            check(uuid(line.instanceId) && line.quantity === 1 && !seen.has(line.instanceId.toLowerCase()));seen.add(line.instanceId.toLowerCase());
        }
        check(line.gvviId === undefined || text(line.gvviId,100));
        check(line.image == null || text(line.image,4096));
        check(line.askingMinor == null || integer(line.askingMinor,0,100000000));
    }
    if (value.trades.length) negotiatedTradeTotals(value.trades);
    const total = amounts(value);check(integer(total.total,0,100000000) && integer(total.credit,0,100000000));
    if (value.payments !== undefined) check(Array.isArray(value.payments) && value.payments.length <= 4 && value.payments.every(e =>
        object(e) && Object.keys(e).sort().join(',') === 'amountMinor,method,tenderedMinor' && tenderMethods.includes(e.method) &&
        integer(e.amountMinor,0,100000000) && integer(e.tenderedMinor,0,100000000)));
    return value;
}
export function newNegotiatedDraft(id,storeName='') {
    return validateNegotiatedDraft({kind:'negotiated-trade',id,label:'Walk-up trader',storeName,items:[],trades:[],taxMinor:0,
        method:'Cash',note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''}});
}
export function negotiatedDraftTotals(draft) {validateNegotiatedDraft(draft);return amounts(draft);}
export function addNegotiatedTrade(draft,line) {
    validateNegotiatedDraft(draft);
    return validateNegotiatedDraft({...draft,trades:[...draft.trades,validateNegotiatedTradeLine(line)]});
}
export function negotiatedDraftRequest(draft,id,confirmed) {
    validateNegotiatedDraft(draft);check(confirmed === true);
    const {balance} = amounts(draft);
    const payments = paymentSnapshot(draft.payments ?? (balance === 0 ? [] :
        [{method:draft.method,amountMinor:Math.abs(balance),tenderedMinor:Math.abs(balance)}]),balance);
    return validateNegotiatedTradeRequest({id,cart:{version:5,storeName:draft.storeName.trim(),method:paymentMethod(payments.entries),
        items:draft.items.map(({instanceId=null,description,quantity,unitMinor}) => ({instanceId,description:description.trim(),quantity,unitMinor})),
        trades:draft.trades.map(line => ({...line,description:line.description.trim()})),taxMinor:draft.taxMinor,note:draft.note,
        customerId:draft.customerId,customer:{...draft.customer},payments:payments.entries}});
}
export function negotiatedDraftCustomerView(draft) {
    validateNegotiatedDraft(draft);
    return {storeName:draft.storeName,items:draft.items.map(({description,quantity,unitMinor}) => ({description,quantity,unitMinor})),
        trades:draft.trades.map(({description,quantity,creditMinor}) => ({description,quantity,creditMinor})),taxMinor:draft.taxMinor,...amounts(draft)};
}
