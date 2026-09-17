import { normalizeFinishKey } from './shared.mjs';

export const PRIZE_PACK_SCOPE_REVIEW_REASON = 'prize_pack_finish_requires_variant_parent_binding';

export function isPrizePackSourceEvidenceV1(row) {
  if (/(?:^|_)prize_pack(?:_|$)/i.test(String(row?.source_key ?? ''))) return true;
  try {
    const url = new URL(row?.source_url);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const pathname = decodeURIComponent(url.pathname);
    if (/prize[-_ ]pack/i.test(pathname)) return true;
    return /^(?:www\.)?justinbasil\.com$/i.test(url.hostname)
      && /^\/set-lists\/pps\d+(?:\/|$)/i.test(pathname);
  } catch {
    return false;
  }
}

export function requiresPrizePackScopeReviewV1(row) {
  const finish = normalizeFinishKey(row?.finish_key);
  // Preserve the existing explicit stamp lane. Other finishes do not encode the stamp.
  if (!finish || finish === 'stamped') return false;
  const evidence = [row, ...(row.evidence ?? []), ...(row.source_evidence ?? []),
    ...(row.sources ?? []).map(source_key => ({ source_key })),
    ...(row.evidence_urls ?? []).map(source_url => ({ source_url }))];
  return evidence.some(isPrizePackSourceEvidenceV1);
}

export function retainPrintingForScopeReviewV1(row) {
  if (!requiresPrizePackScopeReviewV1(row)) return row;
  return {
    ...row,
    status: row.status === 'conflicting' ? 'conflicting' : 'needs_manual_review',
    authority_status_before_scope_review: row.authority_status_before_scope_review ?? row.status,
    authority_review_reason: PRIZE_PACK_SCOPE_REVIEW_REASON,
  };
}
