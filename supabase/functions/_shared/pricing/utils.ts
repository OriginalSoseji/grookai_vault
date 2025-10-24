// Shared pricing utils for JTCG/eBay integrations

export function toUSD(amount: number | null | undefined, currency?: string | null, fx?: (amt: number, cur: string) => number): number | null {
  if (amount == null || !isFinite(Number(amount))) return null;
  const cur = (currency || 'USD').toUpperCase();
  if (cur === 'USD') return Number(amount);
  try {
    if (fx) return fx(Number(amount), cur);
  } catch {}
  return Number(amount); // fallback: assume USD
}

export function p10(arr: number[]): number | null {
  const vals = (arr || []).filter((x) => typeof x === 'number' && isFinite(x)).sort((a,b)=>a-b);
  if (vals.length === 0) return null;
  if (vals.length < 5) return vals[0];
  const idx = Math.max(0, Math.floor(vals.length * 0.10) - 1);
  return vals[idx] ?? vals[0];
}

// Map eBay itemCondition into our buckets (approximate)
export function mapEbayConditionToBucket(itemCondition?: string | null): 'NM'|'LP'|'MP'|'HP'|'GRD' {
  const v = String(itemCondition || '').toLowerCase();
  if (!v) return 'NM';
  if (v.includes('new') || v.includes('mint') || v.includes('near')) return 'NM';
  if (v.includes('light')) return 'LP';
  if (v.includes('moderate') || v.includes('moderately') || v.includes('play')) return 'MP';
  if (v.includes('heavy')) return 'HP';
  if (v.includes('psa') || v.includes('bgs') || v.includes('cgc') || v.includes('graded')) return 'GRD';
  return 'NM';
}

export function effectivePrice(price?: number | null, shipping?: number | null): number | null {
  const p = (price == null || !isFinite(Number(price))) ? null : Number(price);
  const s = (shipping == null || !isFinite(Number(shipping))) ? 0 : Number(shipping);
  return p == null ? null : Math.max(0, p + s);
}

export function nowIso(): string { return new Date().toISOString(); }

