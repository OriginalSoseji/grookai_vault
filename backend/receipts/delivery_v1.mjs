// Server-only receipt transport. Inputs come from a claimed saved-receipt snapshot.
// Provider keys, arbitrary message bodies and provider URLs never come from a client.
import {receiptText,receiptHtml} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email=/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const phone=/^\+[1-9][0-9]{7,14}$/;
export function receiptDeliveryInput(input) {
  if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['requestId','receiptId','channel','destination','confirmed'].includes(k))||
    !uuid.test(input.requestId)||!uuid.test(input.receiptId)||input.confirmed!==true||!['email','sms'].includes(input.channel)||typeof input.destination!=='string') throw Error('Check the receipt and confirm its destination.');
  const destination=input.destination.trim();
  if(destination.length>254||!(input.channel==='email'?email:phone).test(destination))throw Error(input.channel==='sms'?'Use a phone number with + and country code.':'Enter a valid email address.');
  return {...input,destination};
}
export function receiptSender({env,fetchImpl=fetch}) {
  const local=env.NEXT_PUBLIC_COLLECTOR_STAGING==='true'||env.NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY==='true';
  const enabled=env.GROOKAI_RECEIPT_DELIVERY_ENABLED==='true'&&(!local||fetchImpl!==fetch);
  const from=env.RECEIPT_EMAIL_FROM??'',account=env.RECEIPT_TWILIO_ACCOUNT_SID??'',service=env.RECEIPT_TWILIO_MESSAGING_SERVICE_SID??'';
  const capabilities={email:enabled&&Boolean(env.RECEIPT_RESEND_API_KEY)&&email.test(from)&&from.length<=254,
    sms:enabled&&/^AC[a-f0-9]{32}$/i.test(account)&&/^MG[a-f0-9]{32}$/i.test(service)&&Boolean(env.RECEIPT_TWILIO_AUTH_TOKEN)};
  const auth=channel=>channel==='email'?{Authorization:'Bearer '+env.RECEIPT_RESEND_API_KEY}:
    {Authorization:'Basic '+Buffer.from(account+':'+env.RECEIPT_TWILIO_AUTH_TOKEN).toString('base64')};
  async function request(url,init) {
    return fetchImpl(url,{...init,redirect:'error',signal:AbortSignal.timeout(15000),cache:'no-store'});
  }
  return {
    capabilities,
    async send(job) {
      if(!capabilities[job.channel])throw Error('Receipt sending is unavailable.');
      if(!uuid.test(job.id)||job.template_version!==1||!job.receipt||job.receipt.id!==job.receipt_id)throw Error('Invalid saved receipt.');
      let text,html;
      try { text=receiptText(job.receipt);html=receiptHtml(job.receipt); }
      catch { return {status:'failed',failureCode:'invalid_saved_receipt'}; }
      if(job.channel==='sms'&&text.length>1600)return {status:'failed',failureCode:'receipt_too_long_for_sms'};
      let response;
      try {
        if(job.channel==='email') {
          response=await request('https://api.resend.com/emails',{method:'POST',headers:{...auth('email'),'Content-Type':'application/json','Idempotency-Key':'receipt-v1/'+job.id},
            body:JSON.stringify({from,to:[job.destination],subject:'Receipt '+job.receipt.number+' from '+job.receipt.storeName,text,html})});
        } else {
          response=await request(`https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`,{method:'POST',headers:{...auth('sms'),'Content-Type':'application/x-www-form-urlencoded'},
            body:new URLSearchParams({To:job.destination,MessagingServiceSid:service,Body:text}).toString()});
        }
        if(!response.ok)return {status:[400,401,403,404,413,422,429].includes(response.status)?'failed':'uncertain',failureCode:'provider_http_'+response.status};
        const data=await response.json(),providerId=job.channel==='email'?data.id:data.sid;
        if(!(job.channel==='email'?uuid:/^SM[a-f0-9]{32}$/i).test(providerId??''))return {status:'uncertain',failureCode:'provider_response_unconfirmed'};
        return {status:'accepted',providerId};
      } catch { return {status:'uncertain',failureCode:'provider_response_unconfirmed'}; }
    },
    async status(job) {
      if(!capabilities[job.channel]||job.status!=='accepted')return null;
      if(!(job.channel==='email'?uuid:/^SM[a-f0-9]{32}$/i).test(job.provider_id??''))return null;
      try {
        const url=job.channel==='email'?'https://api.resend.com/emails/'+job.provider_id:
          `https://api.twilio.com/2010-04-01/Accounts/${account}/Messages/${job.provider_id}.json`;
        const response=await request(url,{method:'GET',headers:auth(job.channel)});if(!response.ok)return null;
        const data=await response.json();
        if(job.channel==='email') {
          if(data.id!==job.provider_id||!Array.isArray(data.to)||!data.to.includes(job.destination))return null;
          if(['delivered','opened','clicked'].includes(data.last_event))return 'delivered';
          if(['bounced','failed','suppressed'].includes(data.last_event))return 'failed';
        } else {
          if(data.sid!==job.provider_id||data.account_sid!==account||data.to!==job.destination)return null;
          if(data.status==='delivered'||data.status==='read')return 'delivered';
          if(['failed','undelivered','canceled'].includes(data.status))return 'failed';
        }
      } catch { /* Keep the last proven status; a read failure is not a failed delivery. */ }
      return null;
    },
  };
}

export function receiptDeliveryService({owner,admin,ownerId,sender}) {
  const rpc=async(client,name,params)=>{const r=await client.rpc(name,params);if(r.error)throw Error('Receipt delivery could not be saved. Check its status before trying again.');return r.data;};
  return {
    async capabilities() {
      const c=await rpc(owner,'vendor_receipt_delivery_capabilities_v1');
      return {email:c?.email===true&&sender.capabilities.email,sms:c?.sms===true&&sender.capabilities.sms};
    },
    async send(raw) {
      const input=receiptDeliveryInput(raw);
      if(!sender.capabilities[input.channel])throw Error('Receipt sending is unavailable.');
      const saved=await rpc(owner,'vendor_receipt_delivery_request_v1',{p_request_id:input.requestId,p_receipt_id:input.receiptId,p_channel:input.channel,p_destination:input.destination});
      const job=await rpc(admin,'vendor_receipt_delivery_claim_v1',{p_owner_id:ownerId,p_id:saved.id});
      if(job) {
        if(job.owner_id!==ownerId||job.channel!==input.channel||job.receipt_id!==input.receiptId||job.destination!==input.destination)throw Error('Receipt delivery needs review.');
        let outcome;
        try { outcome=await sender.send(job); } catch { outcome={status:'uncertain',failureCode:'sender_unavailable_after_claim'}; }
        await rpc(admin,'vendor_receipt_delivery_finish_v1',{p_id:job.id,p_claim_token:job.claim_token,p_status:outcome.status,p_provider_id:outcome.providerId??null,p_failure_code:outcome.failureCode??null});
      }
      return rpc(owner,'vendor_receipt_delivery_read_v1',{p_receipt_id:input.receiptId});
    },
    async read(receiptId,{refresh=false}={}) {
      if(!uuid.test(receiptId))throw Error('Invalid receipt.');
      // Resolve owner-authorized IDs before any privileged row read or provider lookup.
      const rows=await rpc(owner,'vendor_receipt_delivery_read_v1',{p_receipt_id:receiptId});
      if(refresh)for(const row of rows.filter(r=>r.status==='accepted').slice(0,5)) {
        const job=await rpc(admin,'vendor_receipt_delivery_poll_v1',{p_owner_id:ownerId,p_id:row.id});
        if(!job||job.owner_id!==ownerId||job.receipt_id!==receiptId)continue;
        const status=await sender.status(job);
        if(status)await rpc(admin,'vendor_receipt_delivery_settle_v1',{p_owner_id:ownerId,p_id:job.id,p_provider_id:job.provider_id,p_status:status});
      }
      return refresh?rpc(owner,'vendor_receipt_delivery_read_v1',{p_receipt_id:receiptId}):rows;
    },
  };
}
