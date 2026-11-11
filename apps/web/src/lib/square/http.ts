import 'server-only';
import {NextResponse} from 'next/server';
import {createServerComponentClient} from '@/lib/supabase/server';
import {getSiteOrigin} from '@/lib/getSiteOrigin';
import {collectorPreview} from '@/lib/collectorPreview';
import {createSquareCommerceBackend} from '../../../../../backend/square/commerce_backend_v2.mjs';

export const squareHeaders = {'Cache-Control': 'private, no-store', 'Vary': 'Cookie, Authorization',
  'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'};
export const squareReply = (value: unknown, status = 200) => NextResponse.json(value, {status, headers: squareHeaders});
export async function squareOwner() {
  if (collectorPreview) return null;
  const client = await createServerComponentClient();
  const {data: {user}, error} = await client.auth.getUser();
  return error || !user ? null : {client, actorId: user.id};
}
export function squareOriginAllowed(request: Request) {
  const origin = request.headers.get('origin');
  return origin ? origin === getSiteOrigin() : /^Bearer \S+$/i.test(request.headers.get('authorization') ?? '');
}
export function squareBackend() {
  if (collectorPreview) throw new Error('square_temporarily_paused');
  return createSquareCommerceBackend();
}
export function squareId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)) throw new Error('square_invalid_request');
  return value;
}
export function squareText(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 255 || /[\x00-\x1f]/.test(value)) throw new Error('square_invalid_request');
  return value;
}
export async function squareBody(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json') || !request.body) throw new Error('square_invalid_request');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {const {done, value} = await reader.read(); if (done) break;
    size += value.byteLength; if (size > 65536) {await reader.cancel(); throw new Error('square_invalid_request');} chunks.push(value);}
  const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('square_invalid_request');
  return body as Record<string, unknown>;
}
const messages: Record<string, [string, number]> = {
  square_withdraw_before_disconnect: ['Remove the allocated cards from Square and resolve pending stock before disconnecting.',409],
  square_stock_unavailable: ['This card is already reserved or is no longer available for Square.',409],
  square_existing_stock_requires_review: ['Square already has stock for this item. Review its quantity before allocating this copy.',409],
  square_stock_requires_review: ['Square stock changed. Check the saved sales and stock status before selling this copy.',409],
  square_stock_release_confirmation_required: ['Confirm the register is online, Square stock is zero, and you still have the physical card.',409],
  square_return_confirmation_required: ['Confirm the physical card was returned before adding it back to your Vault.',409],
  square_completed_refund_required: ['A completed Square refund is required before using this return flow.',409],
  square_graded_return_requires_intake_review: ['Use reviewed intake to receive this graded card back with its certificate.',409],
  square_connection_not_owned: ['This Square connection is unavailable for your account.', 404],
  square_target_not_owned: ['This card is unavailable for your Square connection.', 404],
  square_invalid_request: ['Check the selected cards and try again.', 400],
  square_invalid_selection: ['Choose between 1 and 1,000 cards and confirm the selection.', 400],
  square_copy_ineligible: ['This copy needs a public vendor offer and verified printing before syncing.', 409],
  square_copy_changed: ['This card changed. Reload its current offer before syncing.', 409],
  square_connection_busy: ['Square is already syncing this account. Check its status shortly.', 409],
  square_reconciliation_required: ['An earlier Square result needs checking before another sync.', 409],
  square_adoption_requires_review: ['Reload and confirm the existing Square item before linking it.', 409],
  square_adoption_required: ['An existing Square item needs your confirmation.', 409],
  square_duplicate_sku: ['Multiple Square items use this QR link. Resolve them before syncing.', 409],
  square_managed_fields_changed: ['This item was edited in Square. Review the conflict before syncing.', 409],
  square_mapping_target_missing_or_changed: ['The linked Square item changed or is missing. Review the saved link.', 409],
  square_authorization_required: ['Reconnect Square to continue.', 409],
  square_reconnect_required: ['Reconnect Square to continue.', 409],
  square_refresh_unconfirmed: ['Reconnect Square to recover its interrupted authorization.', 409],
  square_configuration_unavailable: ['Square connection is not available yet.', 503],
  square_linking_disabled: ['Square connection is not available for this account yet.', 503],
  square_sync_disabled: ['Square sync is paused for this account.', 503],
  square_location_locked: ['This connection already has cards linked to its saved location.', 409],
  square_rate_limited: ['Square is busy. Your saved sync can be checked again shortly.', 503],
};
export function squareFailure(error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const known = Object.hasOwn(messages, code);
  const [message, status] = messages[code] ?? ['The Square result is unconfirmed. Check the saved status before trying again.', 503];
  return squareReply({error: message, code: known ? code : 'square_result_unconfirmed'}, status);
}
