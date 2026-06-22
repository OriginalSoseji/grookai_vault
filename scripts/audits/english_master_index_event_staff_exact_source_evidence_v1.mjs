import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const QUEUE_PATH = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/english_master_index_v1/english_master_index_stamped_special_next_action_queue_v1.json',
);
const OUT_DIR = path.join(
  ROOT,
  'docs/audits/english_master_index_source_exhaustion_v1/event_staff_exact_source_evidence_v1',
);
const OUT_JSON = path.join(OUT_DIR, 'event_staff_exact_source_evidence_v1.json');
const OUT_MD = path.join(OUT_DIR, 'event_staff_exact_source_evidence_v1.md');
const FIXTURE_DIR = path.join(
  ROOT,
  'docs/audits/verified_master_set_index_v1/source_fixtures/generated_event_staff_exact_source_evidence_v1',
);

const TARGETS = [
  {
    set_key: 'bwp',
    set_name: 'BW Black Star Promos',
    card_number: 'BW50',
    card_name: 'Tropical Beach',
    variant_key: 'finalist_stamp',
    stamp_label: 'Finalist Stamp',
    sources: [
      {
        source_key: 'theendgames_tropical_beach_finalist_bw50_holo',
        source_kind: 'marketplace_checklist',
        source_url: 'https://theendgames.crystalcommerce.com/buylist/pokemon-pokemon_singles-pokemon_promos/tropical_beach_finalist__bw50__promotional/953353',
        required_terms: ['Tropical Beach', 'Finalist', 'BW50', 'Finish', 'Holo'],
        claimed_finish_key: 'holo',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pricecharting_tropical_beach_finalist_bw50',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/tropical-beach-finalist-bw50',
        required_terms: ['Tropical Beach', 'Finalist', '#BW50'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'bwp',
    set_name: 'BW Black Star Promos',
    card_number: 'BW95',
    card_name: 'Champions Festival',
    variant_key: 'quarter_finalist_stamp',
    stamp_label: 'Quarter Finalist Stamp',
    sources: [
      {
        source_key: 'frontline_champions_festival_quarter_finalist_bw95_holo',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.frontlinegames.net/buylist/pokemon_singles-pokemon_promos-bw_black_star_promos/champions_festival_quarter_finalist__bw95__promotional/420943',
        required_terms: ['Champions Festival', 'Quarter Finalist', 'BW95', 'Finish', 'Holo'],
        claimed_finish_key: 'holo',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'tcgplayer_champions_festival_bw95_quarter_finalist',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/96569/pokemon-black-and-white-promos-champions-festival-bw95-worlds-13-quarter-finalist',
        required_terms: ['Champions Festival', 'BW95', 'Quarter-Finalist'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'dp6',
    set_name: 'Legends Awakened',
    card_number: '130',
    card_name: "Buck's Training",
    variant_key: 'staff_stamp',
    stamp_label: 'Staff Stamp',
    sources: [
      {
        source_key: 'pokecardvalues_bucks_training_staff_prerelease_non_holo_130',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/bucks-training-130-146-non-holo-unlimited-legends-awakened/dp6-130-2-1/',
        required_terms: ["Buck's Training", '130/146', 'Staff Prerelease', 'Non-Holo'],
        claimed_finish_key: 'normal',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'nobleknight_bucks_training_staff_130',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.nobleknight.com/P/2148464238/Bucks-Training---130-146-Prerelease-Staff-P-130',
        required_terms: ["Buck's Training", '130/146', 'Prerelease', 'Staff'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'dp6',
    set_name: 'Legends Awakened',
    card_number: '2',
    card_name: 'Dragonite',
    variant_key: 'staff_stamp',
    stamp_label: 'Staff Stamp',
    sources: [
      {
        source_key: 'pokecardvalues_dragonite_staff_national_non_holo_2',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/dragonite-2-146-non-holo-staff-national-championships-legends-awakened/dp6-2-2-80/',
        required_terms: ['Dragonite', '2/146', 'Staff National Championships', 'Non-Holo'],
        claimed_finish_key: 'normal',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pricecharting_dragonite_national_championships_staff_2',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-legends-awakened/dragonite-national-championships-staff-2',
        required_terms: ['Dragonite', 'National Championships Staff', '#2'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'dpp',
    set_name: 'DP Black Star Promos',
    card_number: 'DP25',
    card_name: 'Tropical Wind',
    variant_key: 'finalist_stamp',
    stamp_label: 'Finalist Stamp',
    sources: [
      {
        source_key: 'pricecharting_tropical_wind_finalist_dp25',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/tropical-wind-finalist-dp25',
        required_terms: ['Tropical Wind', 'Finalist', '#DP25'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'pokumon_tropical_wind_cardname_dp25_non_holo',
        source_kind: 'collector_reference',
        source_url: 'https://pokumon.com/cardname/tropical-wind/',
        required_terms: ['Tropical Wind', 'DP25 English Promo', 'Non-holo'],
        claimed_finish_key: 'normal',
        evidence_type: 'finish_presence',
        review_only_reason: 'Card-name aggregate page supports finish family but does not isolate the exact Finalist DP25 row cleanly enough for promotion.',
      },
    ],
  },
  {
    set_key: 'sm3',
    set_name: 'Burning Shadows',
    card_number: '115',
    card_name: 'Guzma',
    variant_key: 'world_championships_stamp',
    stamp_label: 'World Championships Stamp',
    sources: [
      {
        source_key: 'elitefourum_guzma_regional_staff_reverse_115',
        source_kind: 'collector_reference',
        source_url: 'https://www.elitefourum.com/t/prerelease-staff-card-rarity/25783',
        required_terms: ['Burning Shadows', '115/147', 'Guzma', 'Reverse Holo', 'Regional Championships Staff Promo'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
        review_only_reason: 'Supports Regional Championships Staff, while the queue row says World Championships. Preserve as taxonomy conflict context.',
      },
      {
        source_key: 'pricecharting_guzma_world_championships_2017_115',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-world-championships-2017/guzma-115',
        required_terms: ['Guzma', 'World Championships', '115/147'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'sm8',
    set_name: 'Lost Thunder',
    card_number: '188',
    card_name: "Professor Elm's Lecture",
    variant_key: 'regional_championships_staff_stamp',
    stamp_label: 'Regional Championships Staff Stamp',
    sources: [
      {
        source_key: 'gamenerdz_professor_elms_lecture_regional_staff_reverse_188',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.gamenerdz.com/professor-elms-lecture-188-214-regional-championships-staff-188-league-championship-cards-reverse-holofoil',
        required_terms: ["Professor Elm's Lecture", '188/214', 'Regional Championships', 'Staff', 'Reverse Holofoil'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'tcgplayer_professor_elms_lecture_regional_staff_188',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/181263/pokemon-league-and-championship-cards-professor-elms-lecture-188-214-regional-championships-staff',
        required_terms: ["Professor Elm's Lecture", '188/214', 'Regional Championships', 'Staff'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'smp',
    set_name: 'SM Black Star Promos',
    card_number: 'SM231',
    card_name: 'Champions Festival',
    variant_key: 'quarter_finalist_stamp',
    stamp_label: 'Quarter Finalist Stamp',
    sources: [
      {
        source_key: 'pricecharting_champions_festival_quarter_finalist_sm231',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/champions-festival-quarter-finalist-sm231',
        required_terms: ['Champions Festival', 'Quarter Finalist', '#SM231'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'tcgplayer_champions_festival_sm231_quarter_finalist',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/product/198364/pokemon-sm-promos-champions-festival-sm231-world-championships-2019-quarter-finalist',
        required_terms: ['Champions Festival', 'SM231', 'Quarter Finalist'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'sv10',
    set_name: 'Destined Rivals',
    card_number: '34',
    card_name: "Ethan's Typhlosion",
    variant_key: 'staff_stamp',
    stamp_label: 'Staff Stamp',
    sources: [
      {
        source_key: 'pricecharting_ethans_typhlosion_staff_34',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-destined-rivals/ethan%27s-typhlosion-staff-34',
        required_terms: ["Ethan's Typhlosion", 'Staff', '#34'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'ebay_ethans_typhlosion_staff_holo_34',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/116814846233',
        required_terms: ["Ethan's Typhlosion", 'Staff', '034/182', 'Finish', 'Holo'],
        claimed_finish_key: 'holo',
        evidence_type: 'finish_presence',
        review_only_reason: 'Single live marketplace listing; useful finish context but not stable enough alone for promotion.',
      },
    ],
  },
  {
    set_key: 'sv10',
    set_name: 'Destined Rivals',
    card_number: '49',
    card_name: "Misty's Gyarados",
    variant_key: 'staff_stamp',
    stamp_label: 'Staff Stamp',
    sources: [
      {
        source_key: 'pricecharting_mistys_gyarados_stamped_49',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-destined-rivals/misty%27s-gyarados-stamped-49',
        required_terms: ["Misty's Gyarados", 'Staff', 'Stamped', '#49'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'fanatics_mistys_gyarados_staff_49',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.fanaticscollect.com/buy-now/ca651523-b6dd-4fb3-ac0a-67dd36540d43/2025-pokemon-sv-destined-rivals-prerelease-staff-mistys-gyarados-49-cgc-10-gem',
        required_terms: ["Misty's Gyarados", 'Destined Rivals', 'Prerelease Staff', '#49'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'sv10',
    set_name: 'Destined Rivals',
    card_number: '87',
    card_name: "Team Rocket's Mimikyu",
    variant_key: 'staff_stamp',
    stamp_label: 'Staff Stamp',
    sources: [
      {
        source_key: 'pricecharting_team_rockets_mimikyu_prerelease_staff_87',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-destined-rivals/team-rocket%27s-mimikyu-prerelease-staff-87',
        required_terms: ["Team Rocket's Mimikyu", 'Prerelease Staff', '#87'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'dextcg_team_rockets_mimikyu_set_stamp_staff_87',
        source_kind: 'collector_reference',
        source_url: 'https://dextcg.com/cards/sv10-87',
        required_terms: ["Team Rocket's Mimikyu", 'Set Stamp (Staff)'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'sv10',
    set_name: 'Destined Rivals',
    card_number: '96',
    card_name: "Team Rocket's Tyranitar",
    variant_key: 'staff_stamp',
    stamp_label: 'Staff Stamp',
    sources: [
      {
        source_key: 'ebay_team_rockets_tyranitar_staff_96',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/306517381869',
        required_terms: ["Team Rocket's Tyranitar", 'STAFF Promo', '96/182'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'pricecharting_team_rockets_tyranitar_96',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-destined-rivals/team-rocket%27s-tyranitar-96',
        required_terms: ["Team Rocket's Tyranitar", '096/182', 'STAFF Stamped'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'svp',
    set_name: 'Scarlet & Violet Black Star Promos',
    card_number: '101',
    card_name: 'Pikachu',
    variant_key: 'asia_championship_stamp',
    stamp_label: 'Asia Championship Stamp',
    sources: [
      {
        source_key: 'pokecardvalues_pikachu_svp101_asia_championship_holo',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/Pikachu-SVP101-Holo-Black-Star-Scarlet-Violet-Black-Star-Promos/svp-101-1-17/',
        required_terms: ['Pikachu', 'SVP101', 'Holo', 'Asia Championship Series 2023-24'],
        claimed_finish_key: 'holo',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'bulbapedia_pikachu_svp_promo_101',
        source_kind: 'human_readable_checklist',
        source_url: 'https://bulbapedia.bulbagarden.net/wiki/Pikachu_(SVP_Promo_101)',
        required_terms: ['Pikachu', 'SVP 101'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'svp',
    set_name: 'Scarlet & Violet Black Star Promos',
    card_number: '225',
    card_name: 'Pikachu',
    variant_key: 'world_championships_stamp',
    stamp_label: 'World Championships Stamp',
    sources: [
      {
        source_key: 'pricecharting_pikachu_world_championships_225',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/pikachu-world-championships-225',
        required_terms: ['Pikachu', 'World Championships', '#225'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
      {
        source_key: 'mnk_pikachu_svp225_world_championships',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.mnkcardkingdom.com.au/products/pikachu-svp-225-promo-world-championships-2025',
        required_terms: ['Pikachu', 'SVP 225', 'World Championships 2025'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'swsh2',
    set_name: 'Rebel Clash',
    card_number: '154',
    card_name: "Boss's Orders",
    variant_key: 'regional_championships_stamp',
    stamp_label: 'Regional Championships Stamp',
    sources: [
      {
        source_key: 'pricecharting_bosss_orders_regional_championships_reverse_154',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-rebel-clash/boss%27s-orders-regional-championships-154',
        required_terms: ["Boss's Orders", '154/192', 'Regional Championships', 'Reverse Holo'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'ebay_bosss_orders_staff_regional_reverse_154',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ebay.com/itm/256758371933',
        required_terms: ["Boss's Orders", '154/192', 'Regional Championships', 'STAFF', 'Reverse Holo'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
      },
    ],
  },
  {
    set_key: 'swshp',
    set_name: 'SWSH Black Star Promos',
    card_number: 'SWSH296',
    card_name: 'Champions Festival',
    variant_key: 'quarter_finalist_stamp',
    stamp_label: 'Quarter Finalist Stamp',
    sources: [
      {
        source_key: 'tcgplayer_champions_festival_swsh296_quarter_finalist',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.tcgplayer.com/search/pokemon/product?q=Champions%20Festival%20SWSH296%20Quarter%20Finalist',
        required_terms: ['Champions Festival', 'SWSH296', 'Quarter'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
  {
    set_key: 'xy8',
    set_name: 'BREAKthrough',
    card_number: '138',
    card_name: "Giovanni's Scheme",
    variant_key: 'regional_championships_stamp',
    stamp_label: 'Regional Championships Stamp',
    sources: [
      {
        source_key: 'pokecardvalues_giovannis_scheme_regional_reverse_138',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/giovannis-scheme-138-162-reverse-holo-regional-championships-breakthrough/xy8-138-3-60/',
        required_terms: ["Giovanni's Scheme", '138/162', 'Reverse Holo', 'Regional Championships'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pricecharting_giovannis_scheme_staff_138',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/giovanni%27s-scheme-staff-138',
        required_terms: ["Giovanni's Scheme", '138/162', 'Regional Championships', 'STAFF'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
        review_only_reason: 'Supports a Staff-labeled related lane; current queue row is non-staff Regional Championships.',
      },
    ],
  },
  {
    set_key: 'xy9',
    set_name: 'BREAKpoint',
    card_number: '104',
    card_name: "Misty's Determination",
    variant_key: 'regional_championships_staff_stamp',
    stamp_label: 'Regional Championships Staff Stamp',
    sources: [
      {
        source_key: 'gamenerdz_mistys_determination_regional_staff_reverse_104',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.gamenerdz.com/mistys-determination-104-122-regional-championships-staff-104-league-championship-cards-reverse-holofoil',
        required_terms: ["Misty's Determination", '104/122', 'Regional Championships', 'Staff', 'Reverse Holofoil'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pokecardvalues_mistys_determination_regional_staff_reverse_104',
        source_kind: 'marketplace_checklist',
        source_url: 'https://pokecardvalues.co.uk/cards/mistys-determination-104-122-reverse-holo-unlimited-breakpoint/xy9-104-3-1/',
        required_terms: ["Misty's Determination", '104/122', 'Reverse Holo', 'Staff Regional Championships'],
        claimed_finish_key: 'reverse',
        evidence_type: 'finish_presence',
      },
    ],
  },
  {
    set_key: 'xyp',
    set_name: 'XY Black Star Promos',
    card_number: 'XY27',
    card_name: 'Champions Festival',
    variant_key: 'finalist_stamp',
    stamp_label: 'Finalist Stamp',
    sources: [
      {
        source_key: 'ahiddenfortress_champions_festival_finalist_xy27_holo',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.ahiddenfortress.com/catalog/xy__black_star_promos/5581?filter%5B1855%5D=Naoki+Saito',
        required_terms: ['Champions Festival', 'Finalist', 'XY27', 'Holo'],
        claimed_finish_key: 'holo',
        evidence_type: 'finish_presence',
      },
      {
        source_key: 'pricecharting_champions_festival_finalist_xy27',
        source_kind: 'marketplace_checklist',
        source_url: 'https://www.pricecharting.com/game/pokemon-promo/champions-festival-finalist-xy27',
        required_terms: ['Champions Festival', 'Finalist', '#XY27'],
        claimed_finish_key: null,
        evidence_type: 'identity_presence',
      },
    ],
  },
];

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&ndash;|&#8211;/g, '-')
    .replace(/&mdash;|&#8212;/g, '-')
    .replace(/Pokémon/g, 'Pokemon')
    .replace(/\u00a0/g, ' ');
}

function normalized(value) {
  return decodeHtml(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function fetchText(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiSourceAudit/1.0 (+audit-only; no purchase automation)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return decodeHtml(await response.text());
  } catch (error) {
    const script = [
      '$ProgressPreference = "SilentlyContinue";',
      '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
      `$r = Invoke-WebRequest -Uri ${JSON.stringify(url)} -UseBasicParsing -TimeoutSec 30;`,
      '$r.Content',
    ].join(' ');
    try {
      return decodeHtml(execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
        encoding: 'utf8',
        maxBuffer: 12 * 1024 * 1024,
      }));
    } catch (fallbackError) {
      throw new Error(`${error.message}; powershell_fallback_failed:${fallbackError.status ?? 'unknown'}`);
    }
  }
}

async function inspect(source) {
  try {
    const html = await fetchText(source.source_url);
    const body = normalized(html);
    const term_results = source.required_terms.map((term) => ({
      term,
      found: body.includes(normalized(term)),
    }));
    return {
      ...source,
      fetch_status: 'fetched',
      term_results,
      all_required_terms_found: term_results.every((result) => result.found),
    };
  } catch (error) {
    return {
      ...source,
      fetch_status: `fetch_failed:${error.message}`,
      term_results: source.required_terms.map((term) => ({ term, found: false })),
      all_required_terms_found: false,
    };
  }
}

function queueRows(queue) {
  return (queue.rows || queue.queue || queue.items || []).filter((row) => row.action_bucket === 'event_staff_exact_source');
}

function classify(target, source_checks) {
  const exactFinish = source_checks.filter((source) =>
    source.all_required_terms_found && source.claimed_finish_key && !source.review_only_reason);
  const exactIdentity = source_checks.filter((source) =>
    source.all_required_terms_found && !source.claimed_finish_key && !source.review_only_reason);
  const review = source_checks.filter((source) => source.all_required_terms_found && source.review_only_reason);

  if (exactFinish.length) {
    const finishes = [...new Set(exactFinish.map((source) => source.claimed_finish_key))];
    if (finishes.length > 1) {
      return {
        status: 'conflicting_finish_no_write',
        recommended_finish_key: null,
        exact_finish_source_count: exactFinish.length,
        identity_source_count: exactIdentity.length,
        review_source_count: review.length,
        decision_reason: 'Multiple exact sources assert different active finishes; fail closed.',
      };
    }
    return {
      status: 'source_ready_candidate_no_db_write',
      recommended_finish_key: finishes[0],
      exact_finish_source_count: exactFinish.length,
      identity_source_count: exactIdentity.length,
      review_source_count: review.length,
      decision_reason: 'At least one source proves set, number, card name, event/stamp lane, and active finish. No write package created.',
    };
  }
  if (exactIdentity.length) {
    return {
      status: 'identity_supported_finish_unproven_no_write',
      recommended_finish_key: null,
      exact_finish_source_count: 0,
      identity_source_count: exactIdentity.length,
      review_source_count: review.length,
      decision_reason: 'Source evidence supports the event/stamp identity, but active finish is not independently proven.',
    };
  }
  if (review.length) {
    return {
      status: 'review_only_no_write',
      recommended_finish_key: null,
      exact_finish_source_count: 0,
      identity_source_count: 0,
      review_source_count: review.length,
      decision_reason: 'Only review/context source evidence was found; not enough for promotion.',
    };
  }
  return {
    status: 'source_exhausted_no_exact_source_no_write',
    recommended_finish_key: null,
    exact_finish_source_count: 0,
    identity_source_count: 0,
    review_source_count: 0,
    decision_reason: 'No checked source met the exact required source terms.',
  };
}

function fixtureRecords(results) {
  return results
    .filter((row) => row.classification.status === 'source_ready_candidate_no_db_write')
    .flatMap((row) => row.source_checks
      .filter((source) => source.all_required_terms_found && source.claimed_finish_key && !source.review_only_reason)
      .map((source) => ({
        source_key: 'event_staff_exact_source_evidence_v1',
        source_kind: source.source_kind,
        source_url: source.source_url,
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        finish_key: source.claimed_finish_key,
        rarity: null,
        evidence_type: 'finish_presence',
        evidence_label: `${source.source_key}: exact ${row.stamp_label} active finish ${source.claimed_finish_key}`,
        language: 'en',
        retrieved_at: row.retrieved_at,
        raw_snapshot_ref: `event_staff_exact_source_evidence_v1:${row.set_key}:${row.card_number}:${row.variant_key}:${source.source_key}`,
        notes: 'Audit-only event/staff fixture. Accepted only when source text proves exact set/card identity, event/stamp family, and active finish.',
      })));
}

function mdTable(columns, rows) {
  if (!rows.length) return '_None._\n';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n') + '\n';
}

function buildMarkdown(report) {
  return `# Event/Staff Exact Source Evidence V1

Audit-only pass for stamped/special queue rows in \`event_staff_exact_source\`.

No DB writes, migrations, applies, deletes, parent inserts, child inserts, identity inserts, or cleanup were performed.

## Summary

${mdTable([
    { label: 'metric', value: (row) => row[0] },
    { label: 'value', value: (row) => row[1] },
  ], [
    ['target_queue_rows', report.summary.target_queue_rows],
    ['source_ready_candidates', report.summary.source_ready_candidates],
    ['identity_supported_finish_unproven', report.summary.identity_supported_finish_unproven],
    ['review_only_rows', report.summary.review_only_rows],
    ['source_exhausted_rows', report.summary.source_exhausted_rows],
    ['fixture_records_written', report.summary.fixture_records_written],
    ['write_ready_created', report.summary.write_ready_created],
    ['fingerprint_sha256', `\`${report.fingerprint_sha256}\``],
  ])}

## Results

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'card', value: (row) => row.card_name },
    { label: 'stamp', value: (row) => row.stamp_label },
    { label: 'recommended finish', value: (row) => row.classification.recommended_finish_key ?? '' },
    { label: 'status', value: (row) => row.classification.status },
    { label: 'reason', value: (row) => row.classification.decision_reason },
  ], report.results)}

## Source Checks

${mdTable([
    { label: 'set', value: (row) => row.set_key },
    { label: 'number', value: (row) => row.card_number },
    { label: 'source', value: (row) => row.source_key },
    { label: 'status', value: (row) => row.fetch_status },
    { label: 'all_terms', value: (row) => row.all_required_terms_found },
    { label: 'finish', value: (row) => row.claimed_finish_key ?? '' },
    { label: 'review_only', value: (row) => row.review_only_reason ? 'yes' : 'no' },
    { label: 'url', value: (row) => row.source_url },
  ], report.results.flatMap((row) => row.source_checks.map((source) => ({ ...source, set_key: row.set_key, card_number: row.card_number }))))}

## Guardrails

- Event/staff identity-only sources are preserved but not promoted.
- Live marketplace listing evidence is review-only unless corroborated by a stable checklist-style source.
- Queue rows with no active finish proof remain blocked from write-readiness.
`;
}

async function main() {
  const queue = await readJson(QUEUE_PATH);
  const rows = queueRows(queue);
  const retrieved_at = new Date().toISOString();
  const results = [];

  for (const target of TARGETS) {
    const queueRow = rows.find((row) =>
      row.set_key === target.set_key &&
      String(row.card_number) === target.card_number &&
      row.card_name === target.card_name &&
      row.variant_key === target.variant_key);
    const source_checks = [];
    for (const source of target.sources) {
      source_checks.push(await inspect(source));
    }
    const classification = classify(target, source_checks);
    results.push({
      ...target,
      queue_row_present: Boolean(queueRow),
      retrieved_at,
      source_checks,
      classification,
    });
  }

  const records = fixtureRecords(results);
  const bySet = new Map();
  for (const record of records) {
    if (!bySet.has(record.set_key)) bySet.set(record.set_key, []);
    bySet.get(record.set_key).push(record);
  }

  await fs.rm(FIXTURE_DIR, { recursive: true, force: true });
  for (const [setKey, setRecords] of bySet.entries()) {
    await writeJson(path.join(FIXTURE_DIR, `${setKey}.json`), {
      schema_version: 'verified_master_set_index_source_fixture_v1',
      source_key: 'event_staff_exact_source_evidence_v1',
      generated_at: retrieved_at,
      generation_note: 'Audit-only event/staff exact active finish evidence. No copyrighted page dumps stored.',
      records: setRecords,
    });
  }

  const summary = {
    target_queue_rows: rows.length,
    targets_in_script: TARGETS.length,
    queue_targets_matched: results.filter((row) => row.queue_row_present).length,
    source_ready_candidates: results.filter((row) => row.classification.status === 'source_ready_candidate_no_db_write').length,
    identity_supported_finish_unproven: results.filter((row) => row.classification.status === 'identity_supported_finish_unproven_no_write').length,
    review_only_rows: results.filter((row) => row.classification.status === 'review_only_no_write').length,
    source_exhausted_rows: results.filter((row) => row.classification.status === 'source_exhausted_no_exact_source_no_write').length,
    fixture_records_written: records.length,
    write_ready_created: 0,
  };

  const report = {
    generated_at: retrieved_at,
    version: 'event_staff_exact_source_evidence_v1',
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    apply_performed: false,
    cleanup_performed: false,
    quarantine_performed: false,
    inputs: {
      queue_path: path.relative(ROOT, QUEUE_PATH).replaceAll('\\', '/'),
      fixture_dir: path.relative(ROOT, FIXTURE_DIR).replaceAll('\\', '/'),
    },
    summary,
    results,
  };
  report.fingerprint_sha256 = sha256(stableJson({
    summary,
    results: results.map((row) => ({
      set_key: row.set_key,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      classification: row.classification,
      source_checks: row.source_checks.map((source) => ({
        source_key: source.source_key,
        all_required_terms_found: source.all_required_terms_found,
        claimed_finish_key: source.claimed_finish_key ?? null,
        review_only: Boolean(source.review_only_reason),
      })),
    })),
  }));

  await writeJson(OUT_JSON, report);
  await writeText(OUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    out_json: path.relative(ROOT, OUT_JSON).replaceAll('\\', '/'),
    out_md: path.relative(ROOT, OUT_MD).replaceAll('\\', '/'),
    fixture_dir: path.relative(ROOT, FIXTURE_DIR).replaceAll('\\', '/'),
    summary,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
