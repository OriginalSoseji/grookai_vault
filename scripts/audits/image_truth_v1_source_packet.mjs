import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const RISK_JSON = path.join(OUTPUT_DIR, 'image_truth_risk_queue_v1.json');
const CONFIDENCE_JSON = path.join(OUTPUT_DIR, 'image_truth_confidence_audit_v1.json');
const PACKET_JSON = path.join(OUTPUT_DIR, 'image_truth_missing_display_source_packet_v1.json');
const PACKET_MD = path.join(OUTPUT_DIR, 'image_truth_missing_display_source_packet_v1.md');

const FIXTURE_DIRS = [
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_binderbuilder_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_card_pages_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_bulbapedia_set_list_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_cardtrader_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_gengar_sve_reverse_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_manual_web_exact_finish_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncollectors_xya_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_identity_gap_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmncards_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokellector_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokemoncard_io_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_base_product_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_csv_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_mfb_representative_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_pricecharting_promo_exact_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_reverseholo_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_reverseholo_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcollector_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_identity_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_title_finish_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_prize_pack_preservation_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgcsv_stamped_subtype_v1',
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_tcgplayer_price_guide_preservation_v1',
];

const SOURCE_PRIORITY = {
  tcgcollector_mfb_representative_card_page: 16,
  tcgdex_api_card_image: 15,
  pricecharting_live_page: 14,
  pricecharting_mfb_representative_card_page: 14,
  pricecharting_promo_exact: 13,
  pricecharting_base_product: 12,
  pricecharting_csv_product: 11,
  pricecharting_csv_promo_exact: 11,
  tcgcsv_tcgplayer_catalog_identity: 10,
  tcgcollector_card_variants: 10,
  binderbuilder_set_variant: 9,
  cardtrader_blueprint_index: 8,
  gengar_sve_reverse_variant: 8,
  facetofacegames_sve_reverse_product: 8,
  tcgcsv_product: 7,
  bulbapedia_card_page_release_info: 6,
  bulbapedia_set_list: 6,
  reverseholo_checklist: 5,
  pkmncards_xya_representative_alias: 4,
};

const PRICECHARTING_SET_SLUGS = {
  col1: 'pokemon-call-of-legends',
  mep: 'pokemon-promo',
  sve: 'pokemon-scarlet-%26-violet-energy',
};

const XYA_PKMNCARDS_HOST_ALIASES = new Map([
  ['24a|m manectric ex', 'xy4'],
  ['28a|jolteon ex', 'g1'],
  ['54a|zygarde ex', 'xy10'],
  ['55a|m lucario ex', 'xy3'],
  ['92a|trainers mail', 'xy6'],
  ['107a|professor sycamore', 'xy9'],
]);

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function normalizeFinish(value) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'reverse_holo') return 'reverse';
  if (normalized === 'cosmos_holo') return 'cosmos';
  if (normalized === 'poke_ball_reverse') return 'pokeball';
  if (normalized === 'master_ball_reverse') return 'masterball';
  return normalized;
}

function slugPart(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function priceChartingFinishSlug(finishKey) {
  const normalized = normalizeFinish(finishKey);
  if (normalized === 'reverse') return 'reverse-holo';
  if (normalized === 'cosmos') return 'cosmos-holo';
  if (normalized === 'cracked_ice') return 'cracked-ice-holo';
  if (normalized === 'holo') return 'holo';
  return null;
}

function buildPriceChartingCandidateUrl(row) {
  const setSlug = PRICECHARTING_SET_SLUGS[String(row.set_code ?? '').toLowerCase()];
  const finishSlug = priceChartingFinishSlug(row.finish_key);
  const number = normalizeNumber(row.number);
  if (!setSlug || !finishSlug || !number) return null;
  return `https://www.pricecharting.com/game/${setSlug}/${slugPart(row.card_name)}-${finishSlug}-${number}`;
}

function buildPriceChartingMfbCandidateUrl(row) {
  if (String(row.set_code ?? '').toLowerCase() !== 'mfb') return null;
  if (normalizeFinish(row.finish_key) !== 'normal') return null;
  if (row.exact_child_image_required === true) return null;
  const normalizedName = normalizeText(row.card_name);
  const normalizedNumber = normalizeNumber(row.number);
  const energySlug = {
    'grass energy': 'basic-grass-energy',
    'fire energy': 'basic-fire-energy',
    'lightning energy': 'basic-lightning-energy',
    'water energy': 'basic-water-energy',
  }[normalizedName];
  const trainerRepresentativeSlug = {
    '33:potion': 'potion-squirtle',
    '34:switch': 'switch-bulbasaur',
  }[`${normalizedNumber}:${normalizedName}`];
  const nameSlug = energySlug ?? trainerRepresentativeSlug ?? slugPart(row.card_name);
  if (!nameSlug) return null;
  return `https://www.pricecharting.com/game/pokemon-my-first-battle/${nameSlug}`;
}

function buildTcgCollectorMfbTrainerCandidateUrl(row) {
  if (String(row.set_code ?? '').toLowerCase() !== 'mfb') return null;
  if (normalizeFinish(row.finish_key) !== 'normal') return null;
  if (row.exact_child_image_required === true) return null;
  const key = `${normalizeNumber(row.number)}:${normalizeText(row.card_name)}`;
  return {
    '33:potion': 'https://www.tcgcollector.com/cards/42807/potion-my-first-battle-squirtle-no-010',
    '34:switch': 'https://www.tcgcollector.com/cards/42808/switch-my-first-battle-squirtle-no-011',
  }[key] ?? null;
}

function mfbTcgCollectorRepresentativeRecord(row) {
  if (String(row.set_code ?? '').toLowerCase() !== 'mfb') return null;
  if (normalizeFinish(row.finish_key) !== 'normal') return null;
  if (row.exact_child_image_required === true) return null;
  const key = `${normalizeNumber(row.number)}:${normalizeText(row.card_name)}`;
  return {
    '33:potion': {
      source_url: 'https://www.tcgcollector.com/cards/42807/potion-my-first-battle-squirtle-no-010',
      source_image_url: 'https://static.tcgcollector.com/content/images/93/94/9a/93949a37c6bce0729b8acadcd8ea2bd74b61c3a2bb1c530ab0bc4d1c1f18d366.jpg',
      evidence_label: 'Potion (My First Battle (Squirtle) No. 010) - TCG Collector',
    },
    '34:switch': {
      source_url: 'https://www.tcgcollector.com/cards/42808/switch-my-first-battle-squirtle-no-011',
      source_image_url: 'https://static.tcgcollector.com/content/images/b5/85/2b/b5852b142843af94406599c6f6c81088785705fe6a2b95ad8bb9a813fdd265e1.jpg',
      evidence_label: 'Switch (My First Battle (Squirtle) No. 011) - TCG Collector',
    },
  }[key] ?? null;
}

function htmlTitle(html) {
  const match = String(html ?? '').match(/<title[^>]*>([^<]+)<\/title>/i);
  return clean(match?.[1]?.replace(/\s+/g, ' '));
}

async function fetchHtmlWithPowerShell(url) {
  if (process.platform !== 'win32') return null;
  const command = [
    '& {',
    'param($u)',
    '$ProgressPreference = "SilentlyContinue";',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
    '$response = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 20;',
    '[Console]::Out.Write($response.Content)',
    '}',
  ].join(' ');
  const result = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command, url], {
    maxBuffer: 4 * 1024 * 1024,
    timeout: 30000,
  });
  return result.stdout;
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; source-url-preservation)',
        accept: 'text/html',
      },
    });
    if (!response.ok) return { ok: false, reason: `http_${response.status}`, html: null };
    return { ok: true, reason: 'node_fetch', html: await response.text() };
  } catch (error) {
    try {
      const html = await fetchHtmlWithPowerShell(url);
      if (html) return { ok: true, reason: 'powershell_invoke_webrequest', html };
    } catch (fallbackError) {
      return {
        ok: false,
        reason: error?.name === 'AbortError'
          ? 'fetch_timeout'
          : `fetch_failed:${error?.cause?.code ?? error?.message ?? 'unknown'};fallback_failed:${fallbackError?.message ?? 'unknown'}`,
        html: null,
      };
    }
    return {
      ok: false,
      reason: error?.name === 'AbortError' ? 'fetch_timeout' : `fetch_failed:${error?.cause?.code ?? error?.message ?? 'unknown'}`,
      html: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; source-url-preservation)',
        accept: 'application/json',
      },
    });
    if (!response.ok) return { ok: false, reason: `http_${response.status}`, json: null };
    return { ok: true, reason: 'node_fetch', json: await response.json() };
  } catch (error) {
    try {
      const text = await fetchHtmlWithPowerShell(url);
      if (text) return { ok: true, reason: 'powershell_invoke_webrequest', json: JSON.parse(text) };
    } catch (fallbackError) {
      return {
        ok: false,
        reason: error?.name === 'AbortError'
          ? 'fetch_timeout'
          : `fetch_failed:${error?.cause?.code ?? error?.message ?? 'unknown'};fallback_failed:${fallbackError?.message ?? 'unknown'}`,
        json: null,
      };
    }
    return {
      ok: false,
      reason: error?.name === 'AbortError' ? 'fetch_timeout' : `fetch_failed:${error?.cause?.code ?? error?.message ?? 'unknown'}`,
      json: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function titleMatchesExactPriceChartingPage(row, title) {
  const normalizedTitle = normalizeText(title);
  const name = normalizeText(row.card_name);
  const finish = normalizeFinish(row.finish_key);
  const number = normalizeNumber(row.number);
  if (!normalizedTitle || !name || !number || !normalizedTitle.includes(name)) return false;
  if (!normalizedTitle.includes(number)) return false;
  if (finish === 'holo') return normalizedTitle.includes(`${name} holo ${number}`);
  if (finish === 'reverse') return normalizedTitle.includes(`${name} reverse holo ${number}`);
  if (finish === 'cosmos') return normalizedTitle.includes(`${name} cosmos holo ${number}`);
  if (finish === 'cracked_ice') return normalizedTitle.includes(`${name} cracked ice holo ${number}`);
  return false;
}

function titleMatchesMfbRepresentativePage(row, title) {
  const normalizedTitle = normalizeText(title);
  const name = normalizeText(row.card_name);
  if (!normalizedTitle || !name) return false;
  if (normalizedTitle.includes(' list')) return false;
  return normalizedTitle.includes(name)
    && normalizedTitle.includes('prices')
    && normalizedTitle.includes('pokemon my first battle')
    && normalizedTitle.includes('pokemon cards');
}

async function fetchVerifiedPriceChartingSource(row) {
  const sourceUrl = buildPriceChartingCandidateUrl(row);
  if (!sourceUrl) return null;
  try {
    const fetched = await fetchHtml(sourceUrl);
    if (!fetched.ok) {
      return {
        rejected_url: sourceUrl,
        rejection_reason: fetched.reason,
        title: null,
      };
    }
    const html = fetched.html;
    const title = htmlTitle(html);
    if (!titleMatchesExactPriceChartingPage(row, title)) {
      return {
        rejected_url: sourceUrl,
        rejection_reason: 'pricecharting_title_not_exact',
        title,
      };
    }
    return {
      source_key: 'pricecharting_live_page',
      source_kind: 'marketplace_checklist',
      source_url: sourceUrl,
      evidence_type: 'finish_presence',
      evidence_label: title,
      raw_snapshot_ref: `pricecharting_live_page:${new Date().toISOString()}:${row.set_code}:${row.number}:${row.finish_key}`,
      fixture_file: null,
      fetch_method: fetched.reason,
    };
  } catch (error) {
    return {
      rejected_url: sourceUrl,
      rejection_reason: error?.name === 'AbortError' ? 'pricecharting_fetch_timeout' : 'pricecharting_fetch_failed',
      title: null,
    };
  }
}

async function fetchVerifiedMfbPriceChartingSource(row) {
  const sourceUrl = buildPriceChartingMfbCandidateUrl(row);
  if (!sourceUrl) return null;
  try {
    const fetched = await fetchHtml(sourceUrl);
    if (!fetched.ok) {
      return {
        rejected_url: sourceUrl,
        rejection_reason: fetched.reason,
        title: null,
      };
    }
    const title = htmlTitle(fetched.html);
    if (!titleMatchesMfbRepresentativePage(row, title)) {
      return {
        rejected_url: sourceUrl,
        rejection_reason: 'pricecharting_mfb_title_not_representative_card_page',
        title,
      };
    }
    return {
      source_key: 'pricecharting_mfb_representative_card_page',
      source_kind: 'marketplace_checklist',
      source_url: sourceUrl,
      evidence_type: 'card_identity',
      evidence_label: title,
      raw_snapshot_ref: `pricecharting_mfb_representative:${new Date().toISOString()}:${row.set_code}:${row.number}:${row.finish_key}`,
      fixture_file: null,
      fetch_method: fetched.reason,
    };
  } catch (error) {
    return {
      rejected_url: sourceUrl,
      rejection_reason: error?.name === 'AbortError' ? 'pricecharting_mfb_fetch_timeout' : 'pricecharting_mfb_fetch_failed',
      title: null,
    };
  }
}

async function fetchVerifiedMfbTcgCollectorSource(row) {
  const record = mfbTcgCollectorRepresentativeRecord(row);
  if (!record) return null;
  return {
    source_key: 'tcgcollector_mfb_representative_card_page',
    source_kind: 'collector_reference',
    source_url: record.source_url,
    source_image_url: record.source_image_url,
    evidence_type: 'card_identity',
    evidence_label: record.evidence_label,
    raw_snapshot_ref: `tcgcollector_mfb_representative:${new Date().toISOString()}:${row.set_code}:${row.number}:${row.finish_key}`,
    fixture_file: null,
    fetch_method: 'preserved_static_image_url_with_card_page_evidence',
  };
}

async function fetchVerifiedTcgdexImageSource(row) {
  if (String(row.set_code ?? '').toLowerCase() !== 'sm115') return null;
  if (normalizeFinish(row.finish_key) !== 'holo') return null;
  const number = String(row.number ?? '').trim().toUpperCase();
  if (!/^SV\d+$/i.test(number)) return null;
  const sourceUrl = `https://api.tcgdex.net/v2/en/cards/sma-${encodeURIComponent(number)}`;
  const fetched = await fetchJson(sourceUrl);
  if (!fetched.ok || !fetched.json) {
    return {
      rejected_url: sourceUrl,
      rejection_reason: fetched.reason,
      title: null,
    };
  }
  const card = fetched.json;
  if (normalizeText(card.name) !== normalizeText(row.card_name) || normalizeNumber(card.localId) !== normalizeNumber(row.number)) {
    return {
      rejected_url: sourceUrl,
      rejection_reason: 'tcgdex_card_identity_not_exact',
      title: `${card.localId ?? '?'} ${card.name ?? '?'}`,
    };
  }
  if (!clean(card.image)) {
    return {
      rejected_url: sourceUrl,
      rejection_reason: 'tcgdex_card_image_missing',
      title: `${card.localId ?? '?'} ${card.name ?? '?'}`,
    };
  }
  return {
    source_key: 'tcgdex_api_card_image',
    source_kind: 'structured_api',
    source_url: sourceUrl,
    evidence_type: 'card_identity',
    evidence_label: `TCGdex image card ${card.id} ${card.name}`,
    raw_snapshot_ref: `tcgdex_image:${card.id}`,
    fixture_file: null,
    fetch_method: fetched.reason,
  };
}

function sourcePriority(record) {
  return SOURCE_PRIORITY[record.source_key] ?? 1;
}

async function fileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function listJsonFiles(dir) {
  if (!(await fileExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractRecords(json, file) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.records)) return json.records;
  if (Array.isArray(json.rows)) return json.rows;
  if (Array.isArray(json.evidence_rows)) return json.evidence_rows;
  if (Array.isArray(json.fixtures)) return json.fixtures;
  if (json.source_url && (json.card_number || json.card_name)) return [json];
  return [];
}

async function loadSourceRecords() {
  const files = [...new Set((await Promise.all(FIXTURE_DIRS.map(listJsonFiles))).flat())];
  const records = [];
  for (const file of files) {
    let json;
    try {
      json = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      continue;
    }
    for (const record of extractRecords(json, file)) {
      const sourceUrl = clean(record.source_url ?? json.source_url);
      const setKey = clean(record.set_key ?? record.set_code ?? json.set_key);
      const cardNumber = clean(record.card_number ?? record.number);
      const cardName = clean(record.card_name ?? record.name);
      const finishKey = clean(record.finish_key);
      const evidenceType = clean(record.evidence_type);
      if (!sourceUrl || !setKey || !cardNumber || !cardName) continue;
      if (!finishKey && evidenceType !== 'card_identity') continue;
      const normalizedRecord = {
        fixture_file: file.replaceAll('\\', '/'),
        source_key: clean(record.source_key ?? json.source_key),
        source_kind: clean(record.source_kind ?? json.source_kind),
        source_url: sourceUrl,
        set_key: setKey,
        card_number: cardNumber,
        card_name: cardName,
        finish_key: finishKey,
        evidence_type: evidenceType,
        evidence_label: clean(record.evidence_label),
        raw_snapshot_ref: clean(record.raw_snapshot_ref),
        notes: clean(record.notes),
        match_key: finishKey
          ? [
              setKey.toLowerCase(),
              normalizeNumber(cardNumber),
              normalizeText(cardName),
              normalizeFinish(finishKey),
            ].join('|')
          : null,
        identity_match_key: [
          setKey.toLowerCase(),
          normalizeNumber(cardNumber),
          normalizeText(cardName),
        ].join('|'),
      };
      records.push(normalizedRecord);

      const xyaAliasHost = XYA_PKMNCARDS_HOST_ALIASES.get([
        normalizeNumber(cardNumber),
        normalizeText(cardName),
      ].join('|'));
      if (
        normalizedRecord.source_key === 'pkmncards' &&
        evidenceType === 'card_identity' &&
        xyaAliasHost &&
        String(setKey).toLowerCase() === xyaAliasHost
      ) {
        records.push({
          ...normalizedRecord,
          source_key: 'pkmncards_xya_representative_alias',
          set_key: 'xya',
          evidence_type: 'card_identity',
          notes: [
            normalizedRecord.notes,
            'Image Truth representative-only alias: PKMNCards preserved the suffixed host-set card page for the Yellow A Alternate card number. This does not create finish truth.',
          ].filter(Boolean).join(' '),
          match_key: null,
          identity_match_key: [
            'xya',
            normalizeNumber(cardNumber),
            normalizeText(cardName),
          ].join('|'),
        });
      }
    }
  }
  return records;
}

function buildSourceIndex(records) {
  const index = new Map();
  const identityIndex = new Map();
  for (const record of records) {
    if (record.match_key) {
      const bucket = index.get(record.match_key) ?? [];
      bucket.push(record);
      index.set(record.match_key, bucket);
    }
    const identityBucket = identityIndex.get(record.identity_match_key) ?? [];
    identityBucket.push(record);
    identityIndex.set(record.identity_match_key, identityBucket);
  }
  for (const bucket of [...index.values(), ...identityIndex.values()]) {
    bucket.sort((a, b) => sourcePriority(b) - sourcePriority(a) || a.source_url.localeCompare(b.source_url));
  }
  return { index, identityIndex };
}

function targetMatchKey(row) {
  return [
    String(row.set_code ?? '').toLowerCase(),
    normalizeNumber(row.number),
    normalizeText(row.card_name),
    normalizeFinish(row.finish_key),
  ].join('|');
}

function targetIdentityMatchKey(row) {
  return [
    String(row.set_code ?? '').toLowerCase(),
    normalizeNumber(row.number),
    normalizeText(row.card_name),
  ].join('|');
}

function classifyEvidence(matches) {
  if (matches.length === 0) {
    return {
      source_status: 'source_url_needed',
      image_confidence: 'blocked_no_source',
      dry_run_ready: false,
      notes: 'No preserved exact source URL matched set + number + name + finish.',
    };
  }

  const hasExactFinishPresence = matches.some((match) => match.evidence_type === 'finish_presence');
  const hasRepresentativeIdentity = matches.some((match) => match.evidence_type === 'card_identity');
  return {
    source_status: hasExactFinishPresence
      ? 'source_url_preserved'
      : hasRepresentativeIdentity
        ? 'representative_source_url_preserved'
        : 'source_url_preserved_review_needed',
    image_confidence: 'representative',
    dry_run_ready: false,
    notes: hasExactFinishPresence
      ? 'Preserved source URL proves exact finish identity. Image remains representative until a normalized exact asset is captured from the source.'
      : hasRepresentativeIdentity
        ? 'Preserved source URL proves exact card identity only. Any image from this source may be representative, not exact finish truth.'
        : 'Preserved source URL exists, but evidence type is not exact finish_presence. Manual review required before asset capture.',
  };
}

function markdownTable(rows, columns) {
  if (rows.length === 0) return '_None._';
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const divider = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  return [header, divider, ...body].join('\n');
}

async function main() {
  const [riskQueue, confidenceAudit] = await Promise.all([
    JSON.parse(await fs.readFile(RISK_JSON, 'utf8')),
    JSON.parse(await fs.readFile(CONFIDENCE_JSON, 'utf8')),
  ]);
  const sourceRecords = await loadSourceRecords();
  const { index: sourceIndex, identityIndex } = buildSourceIndex(sourceRecords);
  const confidenceTargets = (confidenceAudit.missing_display_rows ?? [])
    .filter((row) => row.image_scope === 'english_physical')
    .filter((row) => row.image_confidence === 'missing')
    .filter((row) => row.image_coverage_status === 'missing_display_image');
  const fallbackTargets = (riskQueue.apply_addressable_rows ?? [])
    .filter((row) => row.image_scope === 'english_physical')
    .filter((row) => row.image_coverage_status === 'missing_display_image');
  const targetMap = new Map();
  for (const row of [...confidenceTargets, ...fallbackTargets]) {
    targetMap.set(row.card_printing_id, row);
  }
  const targets = [...targetMap.values()];

  const packetRows = [];
  for (const row of targets) {
    const exactMatches = sourceIndex.get(targetMatchKey(row)) ?? [];
    const identityMatches = (identityIndex.get(targetIdentityMatchKey(row)) ?? [])
      .filter((match) => !match.match_key);
    const matches = [...exactMatches, ...identityMatches];
    const liveTcgdexSource = await fetchVerifiedTcgdexImageSource(row);
    if (liveTcgdexSource?.source_url) {
      const existingUrl = new Set(matches.map((match) => match.source_url));
      if (!existingUrl.has(liveTcgdexSource.source_url)) matches.push(liveTcgdexSource);
    }
    const liveTcgCollectorMfbSource = await fetchVerifiedMfbTcgCollectorSource(row);
    if (liveTcgCollectorMfbSource?.source_url) {
      const existingUrl = new Set(matches.map((match) => match.source_url));
      if (!existingUrl.has(liveTcgCollectorMfbSource.source_url)) matches.push(liveTcgCollectorMfbSource);
    }
    const liveMfbSource = await fetchVerifiedMfbPriceChartingSource(row);
    if (liveMfbSource?.source_url) {
      const existingUrl = new Set(matches.map((match) => match.source_url));
      if (!existingUrl.has(liveMfbSource.source_url)) matches.push(liveMfbSource);
    }
    const liveSource = await fetchVerifiedPriceChartingSource(row);
    if (liveSource?.source_url) {
      const existingUrl = new Set(matches.map((match) => match.source_url));
      if (!existingUrl.has(liveSource.source_url)) matches.push(liveSource);
    }
    matches.sort((a, b) => sourcePriority(b) - sourcePriority(a) || a.source_url.localeCompare(b.source_url));
    const evidence = classifyEvidence(matches);
    packetRows.push({
      card_printing_id: row.card_printing_id,
      printing_gv_id: row.printing_gv_id,
      card_print_id: row.card_print_id,
      parent_gv_id: row.parent_gv_id,
      image_scope: row.image_scope,
      set_code: row.set_code,
      set_name: row.set_name,
      card_name: row.card_name,
      number: row.number,
      finish_key: row.finish_key,
      image_coverage_status: row.image_coverage_status,
      source_queue: row.exact_child_image_required === true ? 'exact_required_missing_display' : 'display_only_missing_display',
      exact_child_image_required: row.exact_child_image_required === true,
      input_image_confidence: row.image_confidence ?? null,
      target_table: 'card_printings',
      parent_overwrite_allowed: false,
      db_write_allowed: false,
      source_status: evidence.source_status,
      image_confidence: evidence.image_confidence,
      dry_run_ready: evidence.dry_run_ready,
      notes: evidence.notes,
      live_source_rejection: liveSource?.rejected_url
        ? liveSource
        : liveTcgCollectorMfbSource?.rejected_url
          ? liveTcgCollectorMfbSource
          : liveMfbSource?.rejected_url
            ? liveMfbSource
            : null,
      preserved_source_urls: matches.slice(0, 5).map((match) => ({
        source_key: match.source_key,
        source_kind: match.source_kind,
        source_url: match.source_url,
        source_image_url: match.source_image_url ?? null,
        evidence_type: match.evidence_type,
        evidence_label: match.evidence_label,
        raw_snapshot_ref: match.raw_snapshot_ref,
        fixture_file: match.fixture_file,
      })),
    });
  }

  const accepted = packetRows.filter((row) => row.source_status === 'source_url_preserved');
  const blocked = packetRows.filter((row) => row.source_status !== 'source_url_preserved');
  const report = {
    generated_at: new Date().toISOString(),
    audit_only: true,
    db_writes_performed: false,
    migrations_created: false,
    scope: {
      image_scope: 'english_physical',
      target_table: 'card_printings',
      parent_overwrite_allowed: false,
      source_url_required: true,
      confidence_allowed: ['exact', 'representative', 'missing_variant_visual'],
      guessed_confidence_allowed: false,
      dry_run_required_before_db_write: true,
    },
    source_fixture_records_loaded: sourceRecords.length,
    full_english_physical_missing_display_rows: confidenceTargets.length,
    target_count: packetRows.length,
    exact_required_target_count: packetRows.filter((row) => row.exact_child_image_required).length,
    display_only_target_count: packetRows.filter((row) => !row.exact_child_image_required).length,
    source_url_preserved_count: accepted.length,
    source_url_needed_count: blocked.length,
    dry_run_ready_count: packetRows.filter((row) => row.dry_run_ready).length,
    rows: packetRows,
  };

  await fs.writeFile(PACKET_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(PACKET_MD, `# Image Truth Missing-Display Source Packet V1

Generated: ${report.generated_at}

Status: audit only. No DB writes. No migrations.

## Guardrails

- image_scope: english_physical only
- target_table: card_printings
- parent_overwrite_allowed: false
- source_url_required: true
- image_confidence_allowed: exact, representative, or missing_variant_visual
- guessed_confidence_allowed: false
- dry_run_required_before_db_write: true

## Summary

- source fixture records loaded: ${report.source_fixture_records_loaded}
- full English physical missing-display rows: ${report.full_english_physical_missing_display_rows}
- target rows reviewed: ${report.target_count}
- exact-required target rows: ${report.exact_required_target_count}
- display-only target rows: ${report.display_only_target_count}
- source URL preserved: ${report.source_url_preserved_count}
- source URL still needed: ${report.source_url_needed_count}
- dry-run ready rows: ${report.dry_run_ready_count}

## Rows

${markdownTable(packetRows, [
  { label: 'set', value: (row) => row.set_code },
  { label: 'queue', value: (row) => row.source_queue },
  { label: 'card', value: (row) => row.card_name },
  { label: 'number', value: (row) => row.number },
  { label: 'finish', value: (row) => row.finish_key },
  { label: 'source status', value: (row) => row.source_status },
  { label: 'image confidence', value: (row) => row.image_confidence },
  { label: 'dry run ready', value: (row) => row.dry_run_ready },
  { label: 'source url', value: (row) => row.preserved_source_urls[0]?.source_url ?? '-' },
  { label: 'printing', value: (row) => row.printing_gv_id ?? row.card_printing_id },
])}
`);

  console.log(JSON.stringify({
    generated: [PACKET_JSON, PACKET_MD],
    target_count: report.target_count,
    source_url_preserved_count: report.source_url_preserved_count,
    source_url_needed_count: report.source_url_needed_count,
    dry_run_ready_count: report.dry_run_ready_count,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
