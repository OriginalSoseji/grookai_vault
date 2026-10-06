const labels={queued:'Queued',sending:'Sending',accepted:'Accepted by sending service · delivery not yet confirmed',delivered:'Delivered',failed:'Not delivered · use Share or contact support',uncertain:'Delivery unconfirmed · do not resend; check with the recipient'};
export const receiptDeliveryLabel=status=>labels[status]??'Delivery status unavailable';
export function receiptDeliveryTransport(client,fetchImpl=fetch) {
  let owner;
  return async (body,receiptId) => {
    const {data:{session}}=await client.auth.getSession();
    if(!session||(owner&&owner!==session.user.id))throw Error('Sign in again before sending a receipt.');
    owner??=session.user.id;
    const response=await fetchImpl('/api/receipts/delivery'+(receiptId?'?receiptId='+encodeURIComponent(receiptId):''),{
      method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(25000),
      headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,
    });
    const current=await client.auth.getSession();
    if(current.data.session?.user.id!==owner)throw Error('Your signed-in account changed.');
    if(!response.ok)throw Error('Delivery could not be confirmed. Check its status before trying again.');
    return response.json();
  };
}
