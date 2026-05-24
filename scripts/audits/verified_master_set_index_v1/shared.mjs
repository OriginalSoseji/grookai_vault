export const DEFAULT_OUTPUT_DIR = 'docs/audits/verified_master_set_index_v1';

export const DEFAULT_PILOT_SETS = [
  { key: 'sv1', tcgdex: 'sv01', pokemontcg: 'sv1', label: 'modern_sv' },
  { key: 'sv2', tcgdex: 'sv02', pokemontcg: 'sv2', label: 'modern_sv' },
  { key: 'swsh9', tcgdex: 'swsh9', pokemontcg: 'swsh9', label: 'swsh_reverse_holo_era' },
];

export const NAMED_STRESS_PILOTS = [
  {
    key: 'ascended_heroes',
    set_name: 'Ascended Heroes',
    label: 'hard_mode_modern_special_set',
    source_aliases: {
      tcgdex: null,
      pokemontcg_io: null,
      official: null,
      bulbapedia: null,
    },
    source_status: {
      tcgdex: 'unavailable',
      pokemontcg_api: 'unavailable',
      official_gallery: 'fixture_required',
      human_readable_checklist: 'fixture_available',
      marketplace_checklist: 'fixture_available',
      collector_reference: 'fixture_available',
    },
    finish_profile: {
      profile_key: 'ascended_heroes_source_backed_v1',
      source_url: 'https://www.pokebeach.com/2026/01/ascended-heroes-set-guide-full-set-list-god-packs-reverse-holos-product-lineup-and-more',
      source_label: 'PokeBeach Ascended Heroes set guide reverse holo rule',
      source_backed: true,
      focus_finishes: ['normal', 'holo', 'reverse', 'pokeball', 'rocket_reverse', 'stamped', 'cosmos', 'cracked_ice', 'other'],
      not_applicable_finishes: ['masterball'],
      expected_parallel_counts: {
        reverse: {
          expected_count: 178,
          basis: 'ThePriceDex lists 178 main-set reverseHolofoil variants; CardDeckr describes 140 Energy pattern reverse variants plus 38 Trainer reverse variants.',
          source_urls: [
            'https://www.thepricedex.com/set/me2pt5/ascended-heroes/price-list',
            'https://carddeckr.com/blog/pokemon-tcg-mega-evolution-ascended-heroes-the-complete-guide-2026/',
          ],
        },
        pokeball: {
          expected_count: 130,
          basis: 'PokeBeach says non-Team Rocket non-ex Pokemon receive a Poke Ball reverse lane; ThePriceDex identifies 130 non-Team Rocket non-ex Pokemon in the main set.',
          source_urls: [
            'https://www.pokebeach.com/2026/01/ascended-heroes-set-guide-full-set-list-god-packs-reverse-holos-product-lineup-and-more',
            'https://www.thepricedex.com/set/me2pt5/ascended-heroes/price-list',
          ],
        },
        rocket_reverse: {
          expected_count: 10,
          basis: 'PokeBeach says Team Rocket Pokemon use an R reverse in place of the Poke Ball lane; ThePriceDex identifies 10 non-ex Team Rocket Pokemon in the main set.',
          source_urls: [
            'https://www.pokebeach.com/2026/01/ascended-heroes-set-guide-full-set-list-god-packs-reverse-holos-product-lineup-and-more',
            'https://www.thepricedex.com/set/me2pt5/ascended-heroes/price-list',
          ],
        },
        masterball: {
          expected_count: 0,
          basis: 'No source-backed Ascended Heroes finish profile includes Master Ball reverse; this finish is explicitly not applicable for this set.',
          source_urls: [
            'https://www.pokebeach.com/2026/01/ascended-heroes-set-guide-full-set-list-god-packs-reverse-holos-product-lineup-and-more',
          ],
        },
      },
      notes: 'Ascended Heroes uses Energy reverse, Poke Ball reverse, and Team Rocket R reverse lanes; Master Ball reverse is not part of this set profile.',
    },
  },
];

export const FINISH_LABELS = {
  normal: 'Normal',
  holo: 'Holo',
  reverse: 'Reverse Holo',
  first_edition_normal: '1st Edition Normal',
  first_edition_holo: '1st Edition Holo',
  pokeball: 'Poke Ball',
  masterball: 'Master Ball',
  rocket_reverse: 'Rocket Reverse',
  stamped: 'Stamped',
  cosmos: 'Cosmos Holo',
  cracked_ice: 'Cracked Ice',
  other: 'Other',
};

export const FINISH_KEY_ALIASES = {
  reverse_holo: 'reverse',
  energy_reverse: 'reverse',
  energy_reverse_holo: 'reverse',
  energy_symbol_reverse: 'reverse',
  energy_symbol_reverse_holo: 'reverse',
  poke_ball_reverse: 'pokeball',
  poke_ball_reverse_holo: 'pokeball',
  master_ball_reverse: 'masterball',
  rocket: 'rocket_reverse',
  rocket_reverse_holo: 'rocket_reverse',
  team_rocket_reverse: 'rocket_reverse',
  team_rocket_r_reverse: 'rocket_reverse',
  cosmos_holo: 'cosmos',
};

export function normalizeFinishKey(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return FINISH_KEY_ALIASES[raw] ?? raw;
}

export const HUMAN_SOURCE_KINDS = new Set([
  'official_gallery',
  'human_readable_checklist',
  'marketplace_checklist',
  'collector_reference',
  'manual_review',
]);

export function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeNumber(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const [head] = raw.split('/');
  const normalizedHead = head.replace(/^0+(?=\d)/, '');
  return normalizedHead || head;
}

export function cardFactKey(record) {
  return [
    normalizeText(record.set_name),
    normalizeNumber(record.card_number),
    normalizeText(record.card_name),
  ].join('|');
}

export function printingFactKey(record) {
  return `${cardFactKey(record)}|${record.finish_key ?? ''}`;
}

export function sortByCardNumber(records) {
  return [...records].sort((a, b) => {
    const left = normalizeNumber(a?.card_number ?? a?.number ?? a?.localId);
    const right = normalizeNumber(b?.card_number ?? b?.number ?? b?.localId);
    return left.localeCompare(right, undefined, { numeric: true });
  });
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function sourceAuthorityKey(row) {
  const rawUrl = String(row?.source_url ?? '').trim();
  if (rawUrl) {
    try {
      const url = new URL(rawUrl);
      return url.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return rawUrl.toLowerCase();
    }
  }
  return String(row?.source_key ?? '').trim().toLowerCase();
}

export function markdownTable(headers, rows) {
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) {
    lines.push(`| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`);
  }
  return lines.join('\n');
}

export async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers: { Accept: 'application/json', ...headers } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}: ${url} :: ${text.slice(0, 250)}`);
  }
  return text ? JSON.parse(text) : {};
}

export async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}
