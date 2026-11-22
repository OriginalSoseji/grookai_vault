import { createBackendClient } from '../supabase_backend_client.mjs';
import { validateSellerDraftInput } from './seller_draft_input_v1.mjs';
import { EbaySellerApiError, EbaySellerListingClient } from './seller_client_v1.mjs';
import { EbaySellerOauthClient } from './seller_oauth_v1.mjs';
import { EbaySellerOauthWorkflow } from './seller_oauth_workflow_v1.mjs';
import { EbaySellerIdentityMediaClient } from './seller_identity_media_v1.mjs';
import { getVerifiedSellerAccessToken } from './seller_token_authority_v1.mjs';
import { qualifyTradingCardConditionChoices } from './seller_condition_choices_v1.mjs';
import { suggestedCopyCondition } from './seller_copy_condition_v1.mjs';
import { EbaySellerPreparationWorkflow } from './seller_preparation_workflow_v1.mjs';
import { EbaySellerPublicationWorkflow } from './seller_publication_workflow_v1.mjs';
import { verifySellerPublicationReview } from './seller_publication_review_v1.mjs';

const fail = code => { throw new EbaySellerApiError(code); };
const uuid = value => typeof value === 'string'
  && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
const copyColumns = 'id,user_id,archived_at,card_print_id,card_printing_id,slab_cert_id,condition_label,is_graded,grade_company,grade_value,grade_label,gv_vi_id';
const photoColumns = 'id,draft_id,user_id,state,storage_path,source_sha256,image_id,image_url,expires_at';
async function required(query, code = 'seller_state_unavailable') {
  let result;
  try { result = await query; } catch { fail(code); }
  if (result.error || result.data === null) fail(code);
  return result.data;
}
async function rpc(db, name, payload) {
  let result;
  try { result = await db.rpc(name, payload); } catch { fail('seller_state_unavailable'); }
  if (result?.error) fail(/^seller_[a-z_]{1,72}$/.test(result.error.message ?? '')
    ? result.error.message : 'seller_state_unavailable');
  if (result?.data === undefined || result.data === null) fail('seller_state_unavailable');
  return result.data;
}
const owner = actorId => { if (!uuid(actorId)) fail('seller_actor_required'); };
const cardCategoryIds = new Set(['183050', '183454', '261328']);

// Production composition only. Test workflows inject their own transports and
// SDK fixtures directly; no public request can select a database or API origin.
export function createEbaySellerBackendService() {
  if (process.env.GV_USER_ACCESS_TOKEN) fail('seller_configuration_unavailable');
  const db = createBackendClient();
  const oauthClient = new EbaySellerOauthClient({ environment: 'production',
    clientId: process.env.EBAY_CLIENT_ID, clientSecret: process.env.EBAY_CLIENT_SECRET,
    ruName: process.env.EBAY_SELLER_RUNAME });
  const clientsForAccount = async ({ actorId, accountId }) => {
    owner(actorId);
    const accessToken = await getVerifiedSellerAccessToken({ db, actorId, accountId, oauthClient });
    return { listing: new EbaySellerListingClient({ environment: 'production', accessToken }),
      media: new EbaySellerIdentityMediaClient({ environment: 'production', accessToken }) };
  };
  const loadCopy = async (actorId, instanceId) => {
    owner(actorId);
    if (!uuid(instanceId)) fail('seller_exact_active_copy_required');
    const copy = await required(db.from('vault_item_instances').select(copyColumns)
      .eq('id', instanceId).eq('user_id', actorId).is('archived_at', null).maybeSingle(), 'seller_exact_active_copy_required');
    return copy;
  };
  const loadContext = async ({ actorId, draftId }) => {
    owner(actorId);
    const draft = await required(db.from('ebay_seller_drafts_v1')
      .select('id,user_id,instance_id,account_id,revision,state,input')
      .eq('id', draftId).eq('user_id', actorId).maybeSingle(), 'seller_draft_not_owned');
    const [copy, photos] = await Promise.all([
      loadCopy(actorId, draft.instance_id), required(db.from('ebay_seller_photos_v1')
        .select(photoColumns).eq('draft_id', draftId).eq('user_id', actorId)
        .neq('state', 'removed').order('created_at').order('id').limit(13)),
    ]);
    if (!Array.isArray(photos) || photos.length > 12) fail('seller_photo_limit');
    return { draft, copy, photos };
  };
  const evidenceForCopy = async ({ actorId, accountId, copy, input, client }) => {
    owner(actorId);
    if (copy.user_id !== actorId || typeof input.categoryId !== 'string'
        || !cardCategoryIds.has(input.categoryId)) fail('listing_copy_condition_unsupported');
    const fetchedAt = Date.now();
    const tree = await client.getDefaultCategoryTree();
    if (typeof tree?.categoryTreeId !== 'string' || !/^\d{1,20}$/.test(tree.categoryTreeId)) fail('seller_category_tree_changed');
    const categorySearch = await client.getCategorySuggestions(tree.categoryTreeId,
      typeof input.categoryName === 'string' && input.categoryName.trim()
        ? input.categoryName.trim() : 'Collectible Card Game Singles');
    const categoryMatches = (Array.isArray(categorySearch?.categorySuggestions)
      ? categorySearch.categorySuggestions : []).filter(row => row?.category?.categoryId === input.categoryId
        && typeof row.category.categoryName === 'string');
    if (categoryMatches.length !== 1) fail('seller_category_changed');
    const categoryName = categoryMatches[0].category.categoryName;
    const categoryAncestors = Array.isArray(categoryMatches[0].categoryTreeNodeAncestors)
      ? categoryMatches[0].categoryTreeNodeAncestors.map(value => typeof value?.categoryName === 'string' ? value.categoryName : '').filter(Boolean)
      : [];
    const categoryPath = [...categoryAncestors.reverse(), categoryName].join(' › ');
    if (!/card/i.test(categoryPath)) fail('seller_category_unsupported');
    const [fulfillment, payment, returns, locationPage, aspects, conditionPolicies, slabCert] = await Promise.all([
      client.getPolicies('fulfillment'), client.getPolicies('payment'), client.getPolicies('return'),
      client.getLocations(), client.getCategoryAspects(tree.categoryTreeId, input.categoryId),
      client.getConditionPolicies(input.categoryId), copy.slab_cert_id
        ? required(db.from('slab_certs').select('id,grader,cert_number,card_print_id,grade,qualifiers')
          .eq('id', copy.slab_cert_id).maybeSingle(), 'listing_certificate_unavailable') : null,
    ]);
    const locations = locationPage?.locations;
    if (!Array.isArray(locations) || !Number.isSafeInteger(locationPage.total)
        || locationPage.total !== locations.length || locations.length > 100) fail('seller_locations_incomplete');
    if (![fulfillment?.fulfillmentPolicies, payment?.paymentPolicies, returns?.returnPolicies]
      .every(values => Array.isArray(values) && values.length > 0)
        || !locations.some(location => location.merchantLocationStatus === 'ENABLED')) fail('seller_setup_required');
    return { sellerAccountId: accountId, categoryId: input.categoryId,
      categoryName, categoryPath: categoryPath.slice(0, 500), marketplaceId: 'EBAY_US', fetchedAt,
      policies: { fulfillment: fulfillment?.fulfillmentPolicies,
        payment: payment?.paymentPolicies, return: returns?.returnPolicies },
      locations, aspects: aspects?.aspects, slabCert,
      conditionChoices: qualifyTradingCardConditionChoices({ categoryId: input.categoryId,
        categoryTreeId: tree.categoryTreeId, isGraded: copy.is_graded, response: conditionPolicies }) };
  };
  const downloadPhoto = async ({ actorId, draftId, photo }) => {
    owner(actorId);
    if (photo.user_id !== actorId || photo.draft_id !== draftId || !uuid(photo.id)
        || photo.storage_path !== `${actorId}/${draftId}/${photo.id}.jpg`) fail('seller_photo_not_owned');
    const blob = await required(db.storage.from('ebay-listing-private').download(photo.storage_path), 'seller_photo_upload_missing');
    if (!Number.isSafeInteger(blob.size) || blob.size < 1 || blob.size > 16 * 1024 * 1024) fail('seller_photo_size_invalid');
    return new Uint8Array(await blob.arrayBuffer());
  };
  return {
    oauth: new EbaySellerOauthWorkflow({ db, oauthClient,
      identityForToken: accessToken => new EbaySellerIdentityMediaClient({ environment: 'production', accessToken }),
      clientId: process.env.EBAY_CLIENT_ID, ruName: process.env.EBAY_SELLER_RUNAME,
      webOrigin: 'https://grookaivault.com' }),
    preparation: new EbaySellerPreparationWorkflow({ db, loadContext, clientsForAccount, evidenceForCopy, downloadPhoto }),
    publication: new EbaySellerPublicationWorkflow({ db,
      clientForAccount: async account => (await clientsForAccount(account)).listing,
      verifyPublicationReview: async review => {
        const context = await loadContext(review);
        const [evidence, observedOffer, observedInventory] = await Promise.all([
          evidenceForCopy({ ...review, copy: context.copy, input: context.draft.input }),
          review.client.getOffer(review.snapshot.offerId), review.client.getInventoryItem('gv-' + review.draftId),
        ]);
        return verifySellerPublicationReview({ ...review, context, evidence, observedOffer, observedInventory });
      } }),
    saveDraft: async (actorId, input) => {
      owner(actorId);
      return rpc(db, 'ebay_seller_save_draft_v1', { p_actor: actorId, p_draft_id: input.draftId,
        p_instance_id: input.instanceId, p_account_id: input.accountId,
        p_expected_revision: input.revision, p_input: validateSellerDraftInput(input.listing) });
    },
    registerPhoto: async (actorId, input) => {
      owner(actorId);
      return rpc(db, 'ebay_seller_register_photo_v1', { p_actor: actorId,
        p_draft_id: input.draftId, p_photo_id: input.photoId, p_expected_revision: input.revision });
    },
    removePhoto: async (actorId, input) => {
      owner(actorId);
      return rpc(db, 'ebay_seller_remove_photo_v1', { p_actor: actorId,
        p_draft_id: input.draftId, p_photo_id: input.photoId, p_expected_revision: input.revision });
    },
    draftAction: async (actorId, input) => {
      owner(actorId);
      return rpc(db, 'ebay_seller_draft_action_v1', { p_actor: actorId,
        p_draft_id: input.draftId, p_request_id: input.requestId,
        p_expected_revision: input.revision, p_action: input.action });
    },
    categorySuggestions: async (actorId, { instanceId, accountId, query }) => {
      owner(actorId);
      if (typeof query !== 'string' || query.trim().length < 2 || query.length > 160) fail('invalid_category_query');
      await rpc(db, 'ebay_seller_assert_enabled_v1', { p_actor: actorId, p_lane: 'preparation' });
      const copy = await loadCopy(actorId, instanceId);
      const client = (await clientsForAccount({ actorId, accountId })).listing;
      const tree = await client.getDefaultCategoryTree();
      if (typeof tree?.categoryTreeId !== 'string' || !/^\d{1,20}$/.test(tree.categoryTreeId)) fail('seller_category_tree_changed');
      const result = await client.getCategorySuggestions(tree.categoryTreeId, query.trim());
      const rows = Array.isArray(result?.categorySuggestions) ? result.categorySuggestions : [];
      const candidates = [];
      for (const row of rows.slice(0, 20)) {
        const category = row?.category;
        const id = category?.categoryId;
        const name = category?.categoryName;
        if (typeof id !== 'string' || !cardCategoryIds.has(id) || typeof name !== 'string') continue;
        const ancestors = Array.isArray(row.categoryTreeNodeAncestors)
          ? row.categoryTreeNodeAncestors.map(value => typeof value?.categoryName === 'string' ? value.categoryName : '').filter(Boolean)
          : [];
        const path = [...ancestors.reverse(), name].join(' › ');
        if (!/card/i.test(path)) continue;
        candidates.push({ id, name: name.slice(0, 160), path: path.slice(0, 500) });
        if (candidates.length === 8) break;
      }
      // Only offer categories whose live eBay condition policy supports the
      // official CCG graded/ungraded descriptors used to bind the listing
      // to this exact Vault copy. Bound the lookup burst and keep responses lean.
      const suggestions = (await Promise.all(candidates.map(async candidate => {
        try {
          const conditionPolicies = await client.getConditionPolicies(candidate.id);
          qualifyTradingCardConditionChoices({
            categoryId: candidate.id, categoryTreeId: tree.categoryTreeId,
            isGraded: copy.is_graded, response: conditionPolicies,
          });
          return candidate;
        } catch { return null; }
      }))).filter(Boolean);
      return { marketplaceId: 'EBAY_US', suggestions };
    },
    metadata: async (actorId, { instanceId, accountId, categoryId, categoryName }) => {
      owner(actorId);
      await rpc(db, 'ebay_seller_assert_enabled_v1', { p_actor: actorId, p_lane: 'preparation' });
      const copy = await loadCopy(actorId, instanceId);
      const client = (await clientsForAccount({ actorId, accountId })).listing;
      const selectedCategory = typeof categoryId === 'string' && /^\d{1,12}$/.test(categoryId)
        ? categoryId : '183454';
      const selectedCategoryName = typeof categoryName === 'string' && categoryName.trim()
        ? categoryName.trim() : 'Collectible Card Game Singles';
      const evidence = await evidenceForCopy({ actorId, accountId, copy,
        input: { categoryId: selectedCategory, categoryName: selectedCategoryName }, client });
      return { ...evidence, suggestedCondition: suggestedCopyCondition({ copy,
        choices: evidence.conditionChoices, slabCert: evidence.slabCert,
        categoryId: selectedCategory }) };
    },
  };
}
