import {
  assertJapaneseCardAssertion,
  normalizeJapaneseCardAssertion,
} from '../card_assertion_contract_v1.mjs';

export const POKEGUARDIAN_JP_CARD_PARSER_VERSION =
  'JPN-MASTER-INDEX-POKEGUARDIAN-JP-CARD-PARSER-V2';
export const POKEGUARDIAN_JP_SOURCE_ID =
  'pokeguardian_release_reports';
export const POKEGUARDIAN_JP_SOURCE_FAMILY =
  'pokeguardian_jp_release_report';

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&nbsp;', ' ');
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function attribute(tag, name) {
  const expression = new RegExp(
    `\\b${name}=(?:"(?<double>[^"]*)"|'(?<single>[^']*)')`,
    'i',
  );
  const match = tag.match(expression);
  return decodeHtml(match?.groups?.double ?? match?.groups?.single ?? '');
}

function parseImageIdentity(url, alt) {
  const filename = decodeURIComponent(
    new URL(url, 'https://www.pokeguardian.com').pathname
      .split('/')
      .at(-1) ?? '',
  );
  const candidate = alt || filename;
  const structuredMatch = candidate.match(
    /^(?<image_id>\d+)_(?<kind>[pt])_(?<slug>.+?)(?:-(?:standard|high|low))?\.(?:jpe?g|png|webp)$/i,
  );
  const filenameStem = filename.replace(/\.[^.]+$/, '');
  return {
    filename,
    source_image_identity:
      structuredMatch?.groups?.image_id ?? (filenameStem || null),
    upstream_image_id: structuredMatch?.groups?.image_id ?? null,
    card_kind: structuredMatch?.groups?.kind?.toLowerCase() ?? null,
    romanized_filename_slug:
      structuredMatch?.groups?.slug ?? null,
  };
}

export function parsePokeGuardianJapaneseMainSetList(body, workItem) {
  const html = Buffer.isBuffer(body) ? body.toString('utf8') : String(body);
  const title = decodeHtml(
    html.match(/<title\b[^>]*>(?<value>[\s\S]*?)<\/title>/i)
      ?.groups?.value,
  );
  const mainSetList =
    /main\s+set\s+list/i.test(title)
    || /set\s+list\s+revealed/i.test(title);
  const allImageTags = [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => match[0]);
  const albumTags = allImageTags.filter((tag) =>
    /\bjw-album-image__image\b/i.test(attribute(tag, 'class')));
  const inlineCardTags = allImageTags.filter((tag) => {
    if (!/\bjw-element-image__image\b/i.test(attribute(tag, 'class'))) {
      return false;
    }
    const imageUrl = attribute(tag, 'src') || attribute(tag, 'data-src');
    if (!imageUrl) return false;
    const identity = parseImageIdentity(imageUrl, attribute(tag, 'alt'));
    return identity.upstream_image_id !== null;
  });
  const selectedTags = albumTags.length > 0 ? albumTags : inlineCardTags;
  const galleryMode =
    albumTags.length > 0 ? 'ordered_album' : 'inline_card_images';

  const cards = [];
  const imageIds = new Set();
  let duplicateImageCount = 0;
  for (const [index, tag] of selectedTags.entries()) {
    const imageUrl = attribute(tag, 'src') || attribute(tag, 'data-src');
    if (!imageUrl) continue;
    const identity = parseImageIdentity(imageUrl, attribute(tag, 'alt'));
    if (!identity.source_image_identity) continue;
    const imageKey = identity.source_image_identity.toLowerCase();
    if (imageIds.has(imageKey)) {
      duplicateImageCount += 1;
      continue;
    }
    imageIds.add(imageKey);
    cards.push({
      source_external_id:
        `${workItem.source_container_id}:${identity.source_image_identity}`,
      source_url: workItem.source_container_url,
      image_url: imageUrl,
      gallery_position: index + 1,
      ...identity,
    });
  }

  if (cards.length === 0) {
    throw new Error(
      `PokeGuardian article ${workItem.source_container_id} yielded zero card-gallery images.`,
    );
  }

  return {
    set: {
      id: workItem.source_container_id,
      name: workItem.source_native_name ?? null,
      native_japanese_name:
        workItem.source_native_japanese_name ?? null,
      source_code:
        workItem.source_native_code ?? workItem.source_container_id,
      release_date: workItem.source_release_date ?? null,
      expected_card_count:
        integerOrNull(workItem.source_expected_card_count),
      ordered_main_set_card_count: cards.length,
    },
    cards: cards.map((card) => ({
      ...card,
      card_number_raw: null,
      card_number_numerator: null,
      card_number_denominator: null,
      source_fields: {
        upstream_image_id: card.upstream_image_id,
        upstream_image_filename: card.filename,
        romanized_filename_slug: card.romanized_filename_slug,
        card_kind_from_filename: card.card_kind,
        number_derived_from_ordered_main_set_album: false,
        printed_card_number_available_from_source: false,
        gallery_mode: galleryMode,
        gallery_position: card.gallery_position,
      },
    })),
    diagnostics: {
      article_title: title,
      article_kind: mainSetList
        ? 'main_set_list'
        : 'partial_release_or_rarity_gallery',
      gallery_mode: galleryMode,
      duplicate_image_count: duplicateImageCount,
    },
  };
}

export function buildPokeGuardianJapaneseCardAssertion({
  card,
  checklist,
  workItem,
  snapshotMetadata,
  rawSnapshotRef,
}) {
  return assertJapaneseCardAssertion(
    normalizeJapaneseCardAssertion({
      source_id: POKEGUARDIAN_JP_SOURCE_ID,
      source_family: POKEGUARDIAN_JP_SOURCE_FAMILY,
      source_kind: 'collector_news_card_gallery',
      source_external_id: card.source_external_id,
      source_url: card.source_url,
      source_container_id: checklist.set.id,
      registry_key: workItem.registry_key,
      language: 'ja',
      parser_version: POKEGUARDIAN_JP_CARD_PARSER_VERSION,
      retrieved_at: snapshotMetadata.fetched_at,
      raw_snapshot_ref: rawSnapshotRef.replaceAll('\\', '/'),
      raw_snapshot_sha256: snapshotMetadata.body_sha256,
      printed_name: null,
      card_number_raw: card.card_number_raw,
      card_number_numerator: card.card_number_numerator,
      card_number_denominator: card.card_number_denominator,
      source_set_code: checklist.set.source_code,
      source_set_name: checklist.set.name,
      image_urls: [card.image_url],
      release_date: checklist.set.release_date,
      source_fields: {
        ...card.source_fields,
        native_japanese_set_name: checklist.set.native_japanese_name,
        article_kind: checklist.diagnostics.article_kind,
        article_assertions_only: true,
        image_references_only: true,
      },
    }),
  );
}

export function pokeGuardianContainerHealth({
  checklist,
  workItem,
  selectedCardCount,
  operatorCardLimit,
}) {
  const expected = integerOrNull(workItem.source_expected_card_count);
  let status = 'complete';
  const findings = ['printed_card_numbers_not_exposed_by_source_article'];

  if (expected !== null && checklist.cards.length < expected) {
    status = 'source_count_mismatch';
    findings.push('ordered_album_smaller_than_expected_card_count');
  }
  if (checklist.diagnostics.article_kind !== 'main_set_list') {
    status = 'source_partial_release_report';
    findings.push('article_is_partial_release_or_rarity_gallery');
  }
  if (checklist.diagnostics.gallery_mode === 'inline_card_images') {
    status = 'source_count_mismatch';
    findings.push('inline_card_image_fallback');
  }
  if (checklist.diagnostics.duplicate_image_count > 0) {
    findings.push('duplicate_source_images_collapsed');
  }
  if (
    operatorCardLimit !== null
    && selectedCardCount < checklist.cards.length
  ) {
    status = 'operator_bounded_partial';
    findings.push('card_scope_limited_by_operator');
  }

  return {
    source_container_id: checklist.set.id,
    registry_key: workItem.registry_key,
    status,
    findings,
    source_expected_card_count: expected,
    ordered_main_set_card_count: checklist.cards.length,
    selected_card_count: selectedCardCount,
    article_kind: checklist.diagnostics.article_kind,
    gallery_mode: checklist.diagnostics.gallery_mode,
    duplicate_image_count: checklist.diagnostics.duplicate_image_count,
  };
}
