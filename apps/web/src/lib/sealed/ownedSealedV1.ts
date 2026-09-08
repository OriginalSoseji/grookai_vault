export const sealedOwnershipEnabled = process.env.NEXT_PUBLIC_SEALED_OWNERSHIP_V1_ENABLED === 'true';
export type SealedCopy = {
  object_kind: 'sealed'; instance_id: string; owner_id: string; gv_vi_id: string;
  sealed_product_variant_id: string; game_key: string; name: string; package_form: string;
  language_code: string; region_code: string | null; edition: string | null; wave: string | null;
  seal_state: string; package_condition: string; intent: string; section_ids: string[];
  reference_market_price: number | null; owned_market_price: number | null; market_currency: string | null;
  asking_price_amount: number | null; asking_price_currency: string | null;
  image_storage_bucket: string | null; image_object_path: string | null;
  notes?: string | null; personal_image_url?: string | null; personal_back_image_url?: string | null;
  show_personal_photos?: boolean;
};
export type SealedTotals = { active_copy_count: number; priced_copy_count: number; unpriced_copy_count: number; totals_by_currency: Record<string, number> };
export type SealedRpc = (name: string, params: Record<string, unknown>) => Promise<unknown>;
export function sealedPhotoPath(owner: string, instance: string, side: 'front' | 'back', revision: string): string {
  if (!/^[a-f0-9]{32}$/.test(revision)) throw new Error('Invalid photo revision');
  return `${owner}/vault-instances/${instance}/${side}/revisions/${revision}`;
}
export function isSealedPhotoPath(path: unknown, owner: string, instance: string, side: 'front' | 'back'): path is string {
  const prefix = `${owner}/vault-instances/${instance}/${side}/`;
  return typeof path === 'string' && path.startsWith(prefix) &&
    /^(current|revisions\/[a-f0-9]{32})$/.test(path.slice(prefix.length));
}
export function sealedIdentity(row: SealedCopy) {
  return [row.name, row.package_form.replaceAll('_', ' '), row.language_code.toUpperCase(), row.region_code, row.edition, row.wave].filter(Boolean).join(' - ');
}
export function parseSealedCopy(input: unknown): SealedCopy {
  if (!input || typeof input !== 'object') throw new Error('Invalid sealed row');
  const r = input as Record<string, unknown>;
  for (const field of ['instance_id', 'sealed_product_variant_id', 'owner_id']) {
    if (typeof r[field] !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(r[field])) throw new Error('Invalid sealed identity');
  }
  if (r.object_kind !== 'sealed' || typeof r.gv_vi_id !== 'string' || !r.gv_vi_id || typeof r.name !== 'string' || !r.name ||
      typeof r.package_form !== 'string' || typeof r.language_code !== 'string' || !Array.isArray(r.section_ids)) throw new Error('Invalid sealed copy');
  for (const field of ['reference_market_price', 'owned_market_price', 'asking_price_amount']) {
    if (r[field] !== null && (typeof r[field] !== 'number' || !Number.isFinite(r[field]) || (r[field] as number) < 0)) throw new Error('Invalid money');
  }
  return r as SealedCopy;
}
export function parseSealedTotals(input: unknown): SealedTotals {
  const r = input as SealedTotals;
  if (!r || ![r.active_copy_count, r.priced_copy_count, r.unpriced_copy_count].every(n => Number.isSafeInteger(n) && n >= 0) ||
    r.priced_copy_count + r.unpriced_copy_count !== r.active_copy_count || !r.totals_by_currency ||
    Object.entries(r.totals_by_currency).some(([c, n]) => !/^[A-Z]{3}$/.test(c) || !Number.isFinite(n) || n < 0)) throw new Error('Invalid sealed totals');
  return r;
}
export function combineUsdTotal(cardValue: number | null, sealed: SealedTotals | null): number | null {
  const sealedValue = sealed?.totals_by_currency.USD;
  if (cardValue == null && sealedValue == null) return null;
  return (Math.round((cardValue ?? 0) * 100) + Math.round((sealedValue ?? 0) * 100)) / 100;
}
export async function verifySealedAddition(rpc: SealedRpc, result: unknown, variant: string, quantity: number) {
  const r = result as { instance_ids: string[]; created_count: number };
  if (!r || !Array.isArray(r.instance_ids) || r.created_count !== quantity || r.instance_ids.length !== quantity || new Set(r.instance_ids).size !== quantity) throw new Error('Copy count mismatch');
  const rows: SealedCopy[] = [];
  for (let i = 0; i < r.instance_ids.length; i += 50) {
    const response = await rpc('get_owned_sealed_copies_v1', { p_instance_ids: r.instance_ids.slice(i, i + 50), p_limit: 50, p_offset: 0 });
    rows.push(...(response as unknown[]).map(parseSealedCopy));
  }
  if (rows.length !== quantity || new Set(rows.map(r => r.instance_id)).size !== quantity ||
    rows.some(row => !r.instance_ids.includes(row.instance_id) || row.sealed_product_variant_id !== variant)) throw new Error('Ownership readback mismatch');
}
