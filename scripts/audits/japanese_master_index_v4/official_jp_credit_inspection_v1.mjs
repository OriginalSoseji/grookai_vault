// Additive review-only parser. It does not change the frozen V3 card adapter.
import { parseOfficialJapaneseCardDetail } from './card_source_adapters/official_jp_v1.mjs';
import { parse } from 'parse5';

export const OFFICIAL_JP_CREDIT_INSPECTION_VERSION = 'JPN-OFFICIAL-CREDIT-INSPECTION-V1';

function descendants(node, predicate) {
  return (node.childNodes ?? []).flatMap((child) => [
    ...(predicate(child) ? [child] : []),
    ...descendants(child, predicate),
  ]);
}

function text(node) {
  if (node.tagName === 'script' || node.tagName === 'style') return '';
  if (node.nodeName === '#text') return node.value;
  return (node.childNodes ?? []).map(text).join(' ');
}

export function inspectOfficialJapaneseCredits(body, expectedCardId) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const card = parseOfficialJapaneseCardDetail(html, expectedCardId);
  const document = parse(html);
  const author = descendants(document, (node) => node.tagName === 'div' &&
    node.attrs?.some((attr) => attr.name === 'class' && attr.value.split(/\s+/).includes('author')))[0];
  const credits = author ? descendants(author, (node) => node.tagName === 'a')
    .map((node) => text(node).replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
  const multipart = card.source_fields?.requires_component_reconciliation === true;
  const status = multipart ? 'multipart_requires_component_review'
    : credits.length > 1 ? 'multiple_illustrators_require_review'
      : credits.length === 1 ? 'single_listed_illustrator'
        : 'no_illustrator_extracted';
  return {
    inspection_version: OFFICIAL_JP_CREDIT_INSPECTION_VERSION,
    card_id: card.card_id,
    printed_name: card.printed_name,
    illustrator_names: credits,
    single_illustrator: status === 'single_listed_illustrator' ? credits[0] : null,
    status,
    multipart_requires_reconciliation: multipart,
    mutation_authority: false,
  };
}
