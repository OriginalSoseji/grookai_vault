import 'server-only';
import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@/lib/supabase/server';
import { getSiteOrigin } from '@/lib/getSiteOrigin';
import { collectorPreview } from '@/lib/collectorPreview';
import { createEbaySellerBackendService } from '../../../../../backend/ebay/seller_backend_service_v1.mjs';

export const sellerHeaders = { 'Cache-Control': 'private, no-store',
  'Vary': 'Cookie, Authorization', 'Referrer-Policy': 'no-referrer' };
export const sellerReply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: sellerHeaders });
export function sellerOriginAllowed(request: Request) {
  const origin = request.headers.get('origin');
  return origin ? origin === getSiteOrigin()
    : /^Bearer \S+$/i.test(request.headers.get('authorization') ?? '');
}
export async function sellerOwner() {
  if (collectorPreview) return null;
  const client = await createServerComponentClient();
  const { data: { user }, error } = await client.auth.getUser();
  return error || !user ? null : { client, actorId: user.id };
}
export const sellerBackend = () => {
  if (collectorPreview) throw new Error('seller_temporarily_paused');
  return createEbaySellerBackendService();
};
export const sellerId = (value: unknown): string => {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)) throw new Error('seller_request_invalid');
  return value;
};
export const sellerRevision = (value: unknown, allowZero = false): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) throw new Error('seller_request_invalid');
  return value;
};
export async function sellerBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') || !request.body) throw new Error('seller_request_invalid');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 120000) { await reader.cancel(); throw new Error('seller_request_too_large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const body: unknown = JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('seller_request_invalid');
  return body as Record<string, unknown>;
}
const messages: Record<string, [string, number]> = {
  seller_request_invalid: ['Check the listing details and try again.', 400],
  seller_request_too_large: ['This listing request is too large.', 413],
  seller_temporarily_paused: ['eBay listing is not available yet.', 503],
  seller_authorization_required: ['Reconnect your eBay seller account to continue.', 409],
  seller_token_refresh_in_progress: ['Your eBay connection is refreshing. Check its status shortly.', 409],
  seller_draft_revision_conflict: ['This draft changed. Refresh it before continuing.', 409],
  seller_review_changed_or_expired: ['Refresh the listing review and fee quote before publishing.', 409],
  seller_copy_reserved: ['This copy is reserved for an eBay listing. Check that listing first.', 409],
  seller_operation_in_progress: ['An eBay operation is already in progress. Check its status.', 409],
  seller_draft_requires_reconciliation: ['Check the existing eBay operation before changing this draft.', 409],
  listing_copy_condition_mismatch: ['The eBay condition must match this saved copy.', 400],
  listing_damage_disclosure_required: ['Confirm the damaged-card disclosure before continuing.', 400],
  listing_copy_grade_mismatch: ['The selected grader and grade must match this saved copy.', 400],
  listing_copy_certificate_mismatch: ['Use the certification number saved with this copy.', 400],
  seller_physical_copy_photos_required: ['Upload photos of this physical copy before preparing the listing.', 400],
  seller_photo_upload_missing: ['Finish uploading the copy photo before continuing.', 409],
  seller_photo_upload_required: ['Finish uploading or remove the pending copy photo before preparing.', 409],
  listing_damage_description_too_long: ['Shorten the condition description to leave room for the damaged-card disclosure.', 400],
  listing_title_invalid: ['Enter a single-line listing title of up to 80 characters.', 400],
  listing_description_required: ['Describe the physical copy you are selling.', 400],
  listing_price_invalid: ['Enter a valid asking price in USD.', 400],
  condition_description_required: ['Describe the card’s condition, including visible wear or damage.', 400],
  listing_condition_required: ['Choose the condition of this exact copy.', 400],
  required_condition_descriptor_missing: ['Complete the required condition, grader and grade fields.', 400],
  condition_descriptor_invalid: ['Choose one of eBay’s current condition options.', 400],
  condition_descriptor_dependency_invalid: ['The selected condition details do not go together. Check the grader and grade.', 400],
  required_category_aspect_missing: ['Complete the required item specifics marked with an asterisk.', 400],
  category_aspect_invalid: ['Check the selected item specifics against eBay’s current options.', 400],
  category_aspect_rule_unsupported: ['This category needs an item-specific rule that grookai cannot prepare yet.', 409],
  condition_descriptor_rule_unsupported: ['This condition needs a provider rule that grookai cannot prepare yet.', 409],
  listing_copy_condition_unsupported: ['This listing workflow supports exact CCG single copies with a known raw or graded identity.', 409],
  listing_certificate_unavailable: ['The saved certificate needs verification before this graded copy can be listed.', 409],
  seller_photo_size_invalid: ['Choose a JPEG or PNG photo up to 16 MB.', 400],
  seller_photo_format_invalid: ['Choose a single JPEG or PNG photo.', 400],
  seller_photo_too_small: ['Use a clearer photo with a long edge of at least 600 pixels.', 400],
  seller_photo_invalid: ['This photo could not be read. Choose another JPEG or PNG.', 400],
  seller_evidence_expired: ['Reload the selling options before preparing this draft.', 409],
  seller_policy_invalid: ['Choose your current eBay shipping, payment and return policies.', 400],
  seller_location_invalid: ['Choose an enabled eBay inventory location.', 400],
  seller_locations_incomplete: ['The complete eBay inventory location list could not be loaded.', 503],
  seller_setup_required: ['Set up shipping, payment and return policies and an inventory location in eBay, then reload the selling options.', 409],
  seller_offer_not_observed_yet: ['The offer is not visible on eBay yet. Check its status later; grookai has not created a replacement.', 409],
  seller_offer_discovery_incomplete: ['The eBay offer read was incomplete. Check again before changing this draft.', 503],
  seller_multiple_offers_require_review: ['More than one eBay offer needs review for this draft. Publishing is paused for this copy.', 409],
  seller_existing_listing_requires_reconciliation: ['This offer is already listed on eBay. Refresh its saved status before taking another action.', 409],
  seller_confirmed_sale_amount_required: ['Enter the actual sale price and confirm that the sale completed.', 400],
  seller_sale_closeout_not_ready: ['Refresh the ended eBay sale before recording it in your Vault.', 409],
  seller_fresh_ended_sale_receipt_required: ['Check eBay status again to verify this exact listing has ended with one sale.', 409],
  seller_exact_active_copy_required: ['This copy needs a verified printing in your Vault before it can be listed.', 409],
  exact_active_copy_required: ['This copy needs a verified printing in your Vault before it can be listed.', 409],
  seller_draft_not_owned: ['This listing draft is unavailable for your signed-in account.', 404],
  seller_draft_input_invalid: ['Check the listing fields before saving. Your local edits are retained.', 400],
};
export function sellerFailure(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const [message, status] = messages[code] ?? ['The eBay result is unconfirmed. Check the saved operation before trying again.', 503];
  return sellerReply({ error: message, code: Object.hasOwn(messages, code) ? code : 'seller_result_unconfirmed' }, status);
}
