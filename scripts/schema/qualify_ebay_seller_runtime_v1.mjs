// Actual local Auth, private Storage and concurrent SDK authority calls.
// Provider responses are injected fixtures; this is not live eBay qualification.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';
import { localSupabaseStatusSecret } from '../lib/local_supabase_cli_status_v1.mjs';
import { EbaySellerOauthWorkflow } from '../../backend/ebay/seller_oauth_workflow_v1.mjs';
import { sellerScopes } from '../../backend/ebay/seller_oauth_v1.mjs';
import { EbaySellerPreparationWorkflow } from '../../backend/ebay/seller_preparation_workflow_v1.mjs';
import { EbaySellerPublicationWorkflow } from '../../backend/ebay/seller_publication_workflow_v1.mjs';
import { EbaySellerIdentityMediaClient } from '../../backend/ebay/seller_identity_media_v1.mjs';
import { verifySellerPublicationReview } from '../../backend/ebay/seller_publication_review_v1.mjs';
import { getVerifiedSellerAccessToken } from '../../backend/ebay/seller_token_authority_v1.mjs';
const root = 'C:/gv_ebay_integrated_20261028';
assert.equal(process.cwd().replaceAll('\\','/'), root);
const base = 'C:/gv_intake_recovery_private_20261027/ebay-seller-labs-v1';
const project = 'ebay-seller-fresh-480-20261028', work = base + '/fresh-480';
const resumed = process.argv[2] === 'resume-v2';
assert.ok(process.argv[2] === undefined || resumed);
const out = base + (resumed ? '/runtime-qualification-v2' : '/runtime-qualification-v1');
assert.equal(fs.existsSync(out), false); fs.mkdirSync(out);
const save = (name,value) => fs.writeFileSync(out + '/' + name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const hash = value => createHash('sha256').update(value).digest('hex');
const candidate = JSON.parse(fs.readFileSync(base + '/candidate-frozen-v1.json'));
assert.equal(hash(fs.readFileSync(root + '/supabase/migrations/' + candidate.migration)),candidate.sha256);
const sql = input => execFileSync('docker',['exec','-i','supabase_db_' + project,'psql','-X','-qAt',
  '-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:60000}).trim();
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'480');
assert.equal(sql('select count(*) from auth.users'),resumed ? '2' : '0');
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
const cliEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/SUPABASE|DATABASE_URL|POSTGRES_URL|SECRET|TOKEN|API_KEY|PASSWORD|VERCEL|BRIDGE_IMPORT/.test(key)));
const credentials = JSON.parse(execFileSync('supabase',['status','--output','json','--workdir',work,
  '--network-id',project],{env:cliEnv,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert.match(credentials.API_URL,/127\.0\.0\.1:60681/);
process.env.SUPABASE_URL = 'http://127.0.0.1:60681';
process.env.SUPABASE_SECRET_KEY = localSupabaseStatusSecret(credentials);
delete process.env.GV_USER_ACCESS_TOKEN;
const { createBackendClient } = await import('../../backend/supabase_backend_client.mjs');
const admin = createBackendClient();
const client = () => createClient(process.env.SUPABASE_URL,credentials.ANON_KEY,
  {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const ok = result => { if (result.error) throw Error(result.error.message); return result.data; };
const rpc = async (db,name,args) => ok(await db.rpc(name,args));
save('intent.json',{at:new Date().toISOString(),project,candidateSha256:candidate.sha256,
  actualSupabase:true,providerTransport:'injected fixtures only',productionWrites:0,neverReset:true});
const stored = resumed ? JSON.parse(fs.readFileSync(base+'/runtime-qualification-v1/accounts-private.json')) : null;
const tests = [], users = [], password = stored?.password ?? randomBytes(32).toString('base64url');
for (const name of ['owner','peer']) {
  const email = `ebay-seller-${name}-480-20261028@local.test`;
  const retainedUser = stored?.users.find(v => v.name === name);
  const user = resumed ? ok(await admin.auth.admin.getUserById(retainedUser.id)).user
    : ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
  const authenticated = client(); ok(await authenticated.auth.signInWithPassword({email,password}));
  assert.equal(ok(await authenticated.auth.getUser()).user.id,user.id);
  users.push({name,id:user.id,email,client:authenticated});
}
save('accounts-private.json',{password,users:users.map(({client,...user}) => user)});
const [owner,peer] = users;
let control = ok(await admin.from('ebay_seller_controls_v1').select('revision').single());
await rpc(admin,'ebay_seller_set_control_v1',{p_expected_revision:control.revision,
  p_linking:true,p_preparation:true,p_publication:true,p_canary_actor_ids:[owner.id]});
const token = 'local-fixture-access-token-not-a-provider-credential';
const refreshToken = 'local-fixture-refresh-token-not-a-provider-credential';
let exchanges = 0;
const oauth = new EbaySellerOauthWorkflow({db:admin,clientId:'local-fixture-client-id',ruName:'Local-Fixture-RuName',
  webOrigin:'https://grookaivault.com',oauthClient:{exchangeCode:async () => {
    exchanges++; return {accessToken:token,refreshToken,approvedScopes:[...sellerScopes],
      accessTokenExpiresAt:new Date(Date.now()+3600000).toISOString(),
      refreshTokenExpiresAt:new Date(Date.now()+86400000).toISOString()};
  }},identityForToken:() => ({getSellerIdentity:async () => ({sellerId:'LOCAL-480-SELLER',username:'Local fixture seller'})})});
assert.ok((await owner.client.from('ebay_accounts').select('access_token')).error);
await assert.rejects(oauth.start(peer.id),error => error.code === 'seller_temporarily_paused');
const started = await oauth.start(owner.id);
const launch = await oauth.launch(new URL(started.launchUrl).searchParams.get('capability'));
const state = new URL(launch.authorizationUrl).searchParams.get('state');
await assert.rejects(oauth.callback({state,code:'local-code',browserNonce:randomBytes(32).toString('base64url')}));
assert.equal(exchanges,0);
const linked = await oauth.callback({state,code:'local-code',browserNonce:launch.cookie.value});
await assert.rejects(oauth.callback({state,code:'local-code',browserNonce:launch.cookie.value}));
assert.equal(exchanges,1); const accountId = linked.accountId;
const status = await rpc(owner.client,'ebay_seller_account_status_v1',{});
assert.equal(status.accountId,accountId); assert.equal(status.linked,true);
assert.ok(!JSON.stringify(status).includes(token));
tests.push('actual_auth_owner_projection_cookie_binding_single_exchange_and_peer_denial');
const card = ok(await admin.from('card_prints').select('id').order('id').limit(1))[0];
const finish = ok(await admin.from('finish_keys').select('key').eq('is_active',true).order('sort_order').limit(1))[0];
const existingPrintings = ok(await admin.from('card_printings').select('id').eq('card_print_id',card.id).eq('finish_key',finish.key));
assert.ok(existingPrintings.length <= 1);
const printing = existingPrintings[0] ?? ok(await admin.from('card_printings').insert({card_print_id:card.id,finish_key:finish.key}).select('id').single());
const createCopy = async () => {
  const result = await rpc(admin,'admin_vault_instance_create_v1',{
    p_user_id:owner.id,p_card_print_id:card.id,p_card_printing_id:printing.id});
  return (Array.isArray(result) ? result[0] : result).id;
};
const instanceId = await createCopy(), draftId = randomUUID(), photoId = randomUUID();
const input = {title:'Local exact physical copy fixture',description:'Local runtime fixture only. Not an actual eBay listing.',
  categoryId:'183454',priceCents:1234,locationKey:'home',policies:{fulfillment:'20',payment:'21',return:'22'},
  aspects:{Game:['Pokemon']},condition:{conditionId:'4000',description:'Wear shown in the supplied fixture photo.',
    descriptors:[{id:'40001',values:['400015']}]}};
const draftArgs = {p_actor:owner.id,p_draft_id:draftId,p_instance_id:instanceId,p_account_id:accountId,
  p_expected_revision:0,p_input:input};
const saves = await Promise.all(Array.from({length:4},() => rpc(admin,'ebay_seller_save_draft_v1',draftArgs)));
assert.ok(saves.every(v => v.revision === 1));
assert.equal(ok(await admin.from('ebay_seller_drafts_v1').select('id').eq('id',draftId)).length,1);
assert.ok((await peer.client.rpc('ebay_seller_draft_status_v1',{p_draft_id:draftId})).error);
assert.ok((await owner.client.rpc('ebay_seller_save_draft_v1',draftArgs)).error);
const photo = await rpc(admin,'ebay_seller_register_photo_v1',{p_actor:owner.id,p_draft_id:draftId,
  p_photo_id:photoId,p_expected_revision:1});
const sharp = createRequire(root + '/backend/package.json')('sharp');
const bytes = await sharp({create:{width:900,height:1200,channels:3,background:'#aabbcc'}}).jpeg().toBuffer();
const claimArgs = {p_actor:owner.id,p_draft_id:draftId,p_request_id:randomUUID(),p_kind:'prepare',
  p_expected_revision:2,p_expected_hash:null,p_claim_nonce:randomUUID()};
assert.equal((await admin.rpc('ebay_seller_operation_claim_v1',claimArgs)).error?.message,'seller_photo_upload_required');
ok(await owner.client.storage.from('ebay-listing-private').upload(photo.path,bytes,{contentType:'image/jpeg'}));
const downloaded = ok(await owner.client.storage.from('ebay-listing-private').download(photo.path));
assert.equal(hash(Buffer.from(await downloaded.arrayBuffer())),hash(bytes));
assert.ok((await peer.client.storage.from('ebay-listing-private').download(photo.path)).error);
assert.ok((await client().storage.from('ebay-listing-private').download(photo.path)).error);
assert.ok((await peer.client.storage.from('ebay-listing-private').upload(photo.path,bytes,{contentType:'image/jpeg'})).error);
assert.ok((await owner.client.storage.from('ebay-listing-private').upload(owner.id+'/'+draftId+'/'+randomUUID()+'.jpg',bytes,{contentType:'image/jpeg'})).error);
const draftStatus = () => rpc(owner.client,'ebay_seller_draft_status_v1',{p_draft_id:draftId});
assert.equal((await draftStatus()).photos[0].state,'ready');
tests.push('four_concurrent_saves_one_draft_and_actual_private_storage_readiness_owner_peer_anon_boundaries');
const loadContext = async () => ({
  draft:ok(await admin.from('ebay_seller_drafts_v1').select('*').eq('id',draftId).single()),
  copy:ok(await admin.from('vault_item_instances').select('*').eq('id',instanceId).single()),
  photos:ok(await admin.from('ebay_seller_photos_v1').select('*').eq('draft_id',draftId).neq('state','removed')),
});
const evidence = () => ({sellerAccountId:accountId,marketplaceId:'EBAY_US',categoryId:'183454',fetchedAt:Date.now(),
  locations:[{merchantLocationKey:'home',merchantLocationStatus:'ENABLED'}],
  policies:Object.fromEntries(['fulfillment','payment','return'].map((kind,index) => [kind,
    [{[kind+'PolicyId']:String(20+index),name:kind+' fixture policy',marketplaceId:'EBAY_US'}]])),
  aspects:[{localizedAspectName:'Game',aspectConstraint:{aspectDataType:'STRING',aspectRequired:true,aspectMode:'SELECTION_ONLY',itemToAspectCardinality:'SINGLE'},aspectValues:[{localizedValue:'Pokemon'}]}],
  conditionChoices:[{conditionId:'4000',inventoryCondition:'USED_VERY_GOOD',conditionDescription:'Ungraded',
    mappingSource:'https://developer.ebay.com/qualified-runtime-fixture',conditionDescriptors:[{
      conditionDescriptorId:'40001',conditionDescriptorName:'Card Condition',
      conditionDescriptorConstraint:{usage:'REQUIRED',mode:'SELECTION_ONLY',cardinality:'SINGLE'},
      conditionDescriptorValues:[{conditionDescriptorValueId:'400015',conditionDescriptorValueName:'Lightly Played'}]}]}]});
let mediaWrites=0, inventoryWrites=0, offerWrites=0, publishWrites=0, withdrawWrites=0;
let observedInventory, observedOffer, releasePublish, publicationEntered;
const publicationStarted = new Promise(resolve => { publicationEntered=resolve; });
const listing = {
  putInventoryItem:async (sku,value) => { inventoryWrites++; observedInventory=structuredClone(value); },
  createOffer:async value => { offerWrites++; observedOffer={...structuredClone(value),offerId:'local-offer-480',status:'UNPUBLISHED'}; return {offerId:observedOffer.offerId}; },
  updateOffer:async (offerId,value) => { offerWrites++; observedOffer={...structuredClone(value),offerId,status:'UNPUBLISHED'}; },
  getOffer:async () => structuredClone(observedOffer),
  getOffersForSku:async () => ({total:1,offers:[{offerId:observedOffer.offerId}]}),
  getListingFees:async () => ({feeSummaries:[{marketplaceId:'EBAY_US',fees:[{feeType:'InsertionFee',amount:{currency:'USD',value:'0.35'}}]}]}),
  publishOffer:async () => { publishWrites++; publicationEntered(); await new Promise(resolve => { releasePublish=resolve; });
    observedOffer={...observedOffer,status:'PUBLISHED',listing:{listingId:'local-listing-480',listingStatus:'ACTIVE',soldQuantity:0}};
    return {listingId:'local-listing-480'}; },
  withdrawOffer:async () => { withdrawWrites++; observedOffer.listing.listingStatus='ENDED'; return {listingId:'local-listing-480'}; },
};
const media = new EbaySellerIdentityMediaClient({environment:'production',accessToken:token,fetchImpl:async (url,options) => {
  assert.equal(new URL(url).origin,'https://apim.ebay.com');
  if (options.method === 'POST') { mediaWrites++; assert.ok(options.body instanceof FormData);
    return new Response(null,{status:201,headers:{location:'https://apim.ebay.com/commerce/media/v1_beta/image/local-photo-480'}}); }
  return Response.json({imageUrl:'https://i.ebayimg.com/images/local-fixture-480.jpg',expirationDate:new Date(Date.now()+86400000).toISOString()});
}});
const preparation = new EbaySellerPreparationWorkflow({db:admin,loadContext,clientsForAccount:async () => ({listing,media}),
  evidenceForCopy:async () => evidence(),downloadPhoto:async ({photo:p}) => Buffer.from(await ok(await admin.storage.from('ebay-listing-private').download(p.storage_path)).arrayBuffer())});
const preparationArgs = {actorId:owner.id,draftId,requestId:randomUUID(),revision:2};
const firstSteps = await Promise.all([preparation.step(preparationArgs),preparation.step(preparationArgs)]);
assert.equal(mediaWrites,1); const first = firstSteps.find(v => v.continuationReady);
assert.ok(first); let prepared;
for (let index=0;index<10;index++) {
  prepared=await preparation.step({...preparationArgs,operationId:first.operationId});
  if (prepared.status==='succeeded') break;
  assert.equal(prepared.continuationReady,true);
}
assert.equal(prepared.status,'succeeded'); assert.equal(inventoryWrites,1); assert.equal(offerWrites,1);
assert.ok((await owner.client.storage.from('ebay-listing-private').upload(photo.path,bytes,{contentType:'image/jpeg',upsert:true})).error);
let reviewed=await draftStatus(); assert.equal(reviewed.state,'prepared');
assert.equal(reviewed.feeQuote.fees[0].amount.cents,35); assert.equal(publishWrites,0);
tests.push('real_sdk_preparation_concurrency_single_media_inventory_offer_and_immutable_review');
const actualVerify = async ({actorId,draftId:currentDraft,revision,accountId:currentAccount,reviewHash,snapshot}) =>
  verifySellerPublicationReview({actorId,draftId:currentDraft,revision,accountId:currentAccount,
    reviewHash,snapshot,context:await loadContext(),evidence:evidence(),observedOffer,observedInventory});
let loseCompletion = true;
const durableDb = {rpc:async (name,args) => {
  const result = await admin.rpc(name,args);
  if (name === 'ebay_seller_operation_complete_v1' && loseCompletion && !result.error) {
    loseCompletion=false; return {data:null,error:{message:'Local fixture lost completion acknowledgement'}};
  }
  return result;
}};
const publisher = new EbaySellerPublicationWorkflow({db:durableDb,clientForAccount:async () => listing,
  verifyPublicationReview:actualVerify});
const publicationArgs = {actorId:owner.id,draftId,requestId:randomUUID(),revision:2,kind:'publish',reviewHash:reviewed.reviewHash};
const publication = publisher.execute(publicationArgs);
await Promise.race([publicationStarted,publication]);
const disposition = await owner.client.rpc('vault_record_exact_instance_disposition_v2',{
  p_instance_id:instanceId,p_disposition_type:'sale',p_sale_price_amount:12.34,p_sale_price_currency:'USD',
  p_counterparty_label:'Local fixture',p_trade_received_description:null,p_trade_cash_direction:null,
  p_trade_cash_amount:null,p_trade_cash_currency:null});
assert.equal(disposition.error?.message,'seller_copy_reserved');
const simultaneous = await publisher.execute(publicationArgs);
assert.equal(simultaneous.recovered,true); assert.equal(publishWrites,1);
releasePublish(); await assert.rejects(publication,error => error.code === 'seller_state_unavailable');
reviewed = await draftStatus(); assert.equal(reviewed.state,'live');
assert.equal((await publisher.execute(publicationArgs)).recovered,true); assert.equal(publishWrites,1);
assert.equal(ok(await admin.from('ebay_seller_reservations_v1').select('id').eq('draft_id',draftId).is('released_at',null)).length,1);
tests.push('publication_reserves_copy_blocks_canonical_sale_and_lost_ack_never_republishes');
await publisher.execute({actorId:owner.id,draftId,requestId:randomUUID(),revision:2,kind:'withdraw',reviewHash:null});
assert.equal(withdrawWrites,1); assert.equal((await draftStatus()).state,'withdrawn');
assert.equal(ok(await admin.from('ebay_seller_reservations_v1').select('id').eq('draft_id',draftId).is('released_at',null)).length,0);
const secondSession=client(); ok(await secondSession.auth.signInWithPassword({email:owner.email,password}));
assert.equal((await rpc(secondSession,'ebay_seller_draft_status_v1',{p_draft_id:draftId})).state,'withdrawn');
tests.push('verified_withdrawal_releases_hold_and_fresh_owner_session_recovers_history');
ok(await admin.from('ebay_accounts').update({access_token_expires_at:new Date(Date.now()-1000).toISOString()}).eq('id',accountId));
let refreshes=0, releaseRefresh, enteredRefresh;
const refreshStarted=new Promise(resolve => { enteredRefresh=resolve; });
const tokenOauth={refresh:async () => {refreshes++;enteredRefresh();await new Promise(resolve => {releaseRefresh=resolve;});
  return {accessToken:token+'-refreshed',accessTokenExpiresAt:new Date(Date.now()+3600000).toISOString(),refreshToken:null,refreshTokenExpiresAt:null};}};
const refreshFirst=getVerifiedSellerAccessToken({db:admin,actorId:owner.id,accountId,oauthClient:tokenOauth});
await Promise.race([refreshStarted,refreshFirst]);
await assert.rejects(getVerifiedSellerAccessToken({db:createBackendClient(),actorId:owner.id,accountId,oauthClient:tokenOauth}),e => e.code==='seller_token_refresh_in_progress');
releaseRefresh();assert.equal(await refreshFirst,token+'-refreshed');assert.equal(refreshes,1);
tests.push('actual_cross_connection_token_refresh_lease_allows_one_grant');
control=ok(await admin.from('ebay_seller_controls_v1').select('revision').single());
await rpc(admin,'ebay_seller_set_control_v1',{p_expected_revision:control.revision,
  p_linking:false,p_preparation:false,p_publication:false,p_canary_actor_ids:[]});
save('result.json',{at:new Date().toISOString(),pass:true,candidateSha256:candidate.sha256,tests,
  actualSharedAuth:true,actualPrivateStorage:true,crossConnectionDurability:true,concurrency:true,
  controlsOffAfter:true,productionWrites:0,actualProviderGrant:false,actualProviderPublication:false,
  fixtureProviderWrites:{media:mediaWrites,inventory:inventoryWrites,offer:offerWrites,publish:publishWrites,withdraw:withdrawWrites}});
console.log(JSON.stringify({pass:true,tests:tests.length,actualSharedAuth:true,actualPrivateStorage:true,productionWrites:0}));
