// Server-only provider transport. Canonical ownership, review and durable
// operation authority must be established before calling mutation methods.
const origins = Object.freeze({production:'https://api.ebay.com',sandbox:'https://api.sandbox.ebay.com'});
const maxResponseBytes = 2_000_000;
export class EbaySellerApiError extends Error {
  constructor(code,{status=null,uncertain=false,retryAfterSeconds=null,errorIds=[]}={}) {
    super(code);this.name='EbaySellerApiError';this.code=code;this.status=status;
    this.uncertain=uncertain;this.retryAfterSeconds=retryAfterSeconds;this.errorIds=errorIds;
  }
}
const id = value => {
  if(typeof value!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(value))throw new EbaySellerApiError('invalid_provider_identifier');
  return encodeURIComponent(value);
};
const receipt = (value,key) => {
  if(!value||typeof value[key]!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(value[key]))throw new EbaySellerApiError('provider_result_uncertain',{uncertain:true});
  return value;
};
const objectPayload = value => {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new EbaySellerApiError('invalid_provider_payload');
  return value;
};
const page = offset => {
  if(!Number.isSafeInteger(offset)||offset<0||offset>10000)throw new EbaySellerApiError('invalid_provider_page');
  return offset;
};
export class EbaySellerListingClient {
  #origin;#token;#fetch;#timeout;
  constructor({environment,accessToken,fetchImpl=globalThis.fetch,timeoutMs=15000}) {
    if(!Object.hasOwn(origins,environment)||typeof accessToken!=='string'||accessToken.length<20||accessToken.length>32768||/[\r\n\0]/.test(accessToken))throw new EbaySellerApiError('seller_configuration_unavailable');
    if(typeof fetchImpl!=='function'||!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw new EbaySellerApiError('seller_configuration_unavailable');
    this.#origin=origins[environment];this.#token=accessToken;this.#fetch=fetchImpl;this.#timeout=timeoutMs;
  }
  async #request(method,path,body,query,mutation=method!=='GET') {const url=new URL(path,this.#origin);
    if(url.origin!==this.#origin||!['/sell/','/commerce/'].some(prefix=>url.pathname.startsWith(prefix)))throw new EbaySellerApiError('invalid_provider_route');
    if(query)for(const [key,value] of Object.entries(query))url.searchParams.set(key,String(value));
    let encoded;try{encoded=body===undefined?undefined:JSON.stringify(body);}catch{throw new EbaySellerApiError('invalid_provider_payload');}
    if(encoded!==undefined&&Buffer.byteLength(encoded)>1_000_000)throw new EbaySellerApiError('provider_payload_too_large');
    let response;
    try {
      response=await this.#fetch(url,{method,redirect:'error',signal:AbortSignal.timeout(this.#timeout),headers:{Authorization:'Bearer '+this.#token,Accept:'application/json','Accept-Language':'en-US',...(encoded===undefined?{}:{'Content-Type':'application/json','Content-Language':'en-US'})},body:encoded});
    }catch{throw new EbaySellerApiError(mutation?'provider_result_uncertain':'provider_unavailable',{uncertain:mutation});}
    let data=null;
    try {
      const chunks=[];let total=0;const reader=response.body?.getReader();
      if(reader)for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxResponseBytes){await reader.cancel();throw Error('bounded');}chunks.push(value);}
      if(total){const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
    }catch{if(response.ok)throw new EbaySellerApiError(mutation?'provider_result_uncertain':'provider_response_invalid',{status:response.status,uncertain:mutation});data=null;}
    if(!response.ok){
      const errorIds=Array.isArray(data?.errors)?data.errors.map(e=>e.errorId).filter(n=>Number.isSafeInteger(n)&&n>=0).slice(0,5):[];
      const rawRetry=response.headers.get('retry-after');const retry=rawRetry===null?NaN:Number(rawRetry);
      const retryAfterSeconds=Number.isFinite(retry)&&retry>=0?Math.min(Math.ceil(retry),3600):null;
      const code=response.status===401||response.status===403?'seller_authorization_required':response.status===429?'provider_rate_limited':response.status===404?'provider_resource_not_found':response.status>=500?(mutation?'provider_result_uncertain':'provider_unavailable'):'provider_request_rejected';
      throw new EbaySellerApiError(code,{status:response.status,uncertain:mutation&&response.status>=500,retryAfterSeconds,errorIds});
    }
    if(data!==null&&(typeof data!=='object'||Array.isArray(data)))throw new EbaySellerApiError(mutation?'provider_result_uncertain':'provider_response_invalid',{status:response.status,uncertain:mutation});
    return data;
  }
  getInventoryItem(sku){return this.#request('GET','/sell/inventory/v1/inventory_item/'+id(sku));}
  putInventoryItem(sku,item){return this.#request('PUT','/sell/inventory/v1/inventory_item/'+id(sku),objectPayload(item));}
  getOffersForSku(sku,offset=0){id(sku);return this.#request('GET','/sell/inventory/v1/offer',undefined,{sku,marketplace_id:'EBAY_US',limit:100,offset:page(offset)});}
  getOffer(offerId){return this.#request('GET','/sell/inventory/v1/offer/'+id(offerId));}
  async createOffer(offer){return receipt(await this.#request('POST','/sell/inventory/v1/offer',objectPayload(offer)),'offerId');}
  updateOffer(offerId,offer){return this.#request('PUT','/sell/inventory/v1/offer/'+id(offerId),objectPayload(offer));}
  getListingFees(offerId){id(offerId);return this.#request('POST','/sell/inventory/v1/offer/get_listing_fees',{offers:[{offerId}]},undefined,false);}
  async publishOffer(offerId){return receipt(await this.#request('POST','/sell/inventory/v1/offer/'+id(offerId)+'/publish'),'listingId');}
  async withdrawOffer(offerId){return receipt(await this.#request('POST','/sell/inventory/v1/offer/'+id(offerId)+'/withdraw'),'listingId');}
  getLocations(offset=0){return this.#request('GET','/sell/inventory/v1/location',undefined,{limit:100,offset:page(offset)});}
  getPolicies(kind){if(!['fulfillment','payment','return'].includes(kind))throw new EbaySellerApiError('invalid_policy_kind');return this.#request('GET','/sell/account/v1/'+kind+'_policy',undefined,{marketplace_id:'EBAY_US'});}
  getDefaultCategoryTree(){return this.#request('GET','/commerce/taxonomy/v1/get_default_category_tree_id',undefined,{marketplace_id:'EBAY_US'});}
  getCategorySuggestions(treeId,query){if(typeof query!=='string'||!query.trim()||query.length>300)throw new EbaySellerApiError('invalid_category_query');return this.#request('GET','/commerce/taxonomy/v1/category_tree/'+id(treeId)+'/get_category_suggestions',undefined,{q:query});}
  getCategoryAspects(treeId,categoryId){id(categoryId);return this.#request('GET','/commerce/taxonomy/v1/category_tree/'+id(treeId)+'/get_item_aspects_for_category',undefined,{category_id:categoryId});}
  getConditionPolicies(categoryId){id(categoryId);return this.#request('GET','/sell/metadata/v1/marketplace/EBAY_US/get_item_condition_policies',undefined,{filter:'categoryIds:{'+categoryId+'}'});}
}
