// Additive review-only parser. It does not change the frozen V3 card adapter.
import { parseOfficialJapaneseCardDetail } from './card_source_adapters/official_jp_v1.mjs';

export const OFFICIAL_JP_CREDIT_INSPECTION_VERSION = 'JPN-OFFICIAL-CREDIT-INSPECTION-V1';

function text(value) {
  return String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#039;', "'")
    .replaceAll('&apos;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ').replace(/\s+/g, ' ').trim();
}

export function inspectOfficialJapaneseCredits(body, expectedCardId) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const card = parseOfficialJapaneseCardDetail(html, expectedCardId);
  const author = html.match(/<div\b[^>]*class=["'][^"']*\bauthor\b[^"']*["'][^>]*>(?<body>[\s\S]*?)<\/div>/i);
  const credits = [...(author?.groups?.body ?? '').matchAll(/<a\b[^>]*>(?<name>[\s\S]*?)<\/a>/gi)]
    .map((match) => text(match.groups.name)).filter(Boolean);
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
