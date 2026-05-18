import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, '..', '..');
export const DATA_DIR = path.join(ROOT, 'data', 'grookai_dex');
export const AUDIT_DIR = path.join(ROOT, 'docs', 'audits', 'grookai_dex_v1');
export const SPECIES_SEED_PATH = path.join(DATA_DIR, 'pokemon_species_seed_v1.json');
export const SPECIES_EXCEPTIONS_PATH = path.join(DATA_DIR, 'pokemon_species_exceptions_v1.json');
export const MAPPING_AUDIT_JSON_PATH = path.join(AUDIT_DIR, 'grookai_dex_mapping_dry_run_20260518.json');
export const MAPPING_AUDIT_MD_PATH = path.join(AUDIT_DIR, 'grookai_dex_mapping_dry_run_20260518.md');
export const SPECIES_AUDIT_JSON_PATH = path.join(AUDIT_DIR, 'grookai_dex_species_dry_run_20260518.json');
export const SPECIES_AUDIT_MD_PATH = path.join(AUDIT_DIR, 'grookai_dex_species_dry_run_20260518.md');

export async function readJson(filePath) {
  const body = await fs.readFile(filePath, 'utf8');
  return JSON.parse(body);
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[♀]/g, ' female ')
    .replace(/[♂]/g, ' male ')
    .replace(/[''.]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function slugToSearchToken(slug) {
  return normalizeText(slug.replace(/-/g, ' '));
}

export function parseArgs(argv) {
  const options = {
    apply: false,
    limit: null,
    failOnWarnings: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') {
      options.apply = true;
    } else if (token === '--fail-on-warnings') {
      options.failOnWarnings = true;
    } else if (token === '--limit' && argv[index + 1]) {
      const parsed = Number.parseInt(argv[index + 1], 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
      index += 1;
    } else if (token.startsWith('--limit=')) {
      const parsed = Number.parseInt(token.slice('--limit='.length), 10);
      if (Number.isInteger(parsed) && parsed > 0) {
        options.limit = parsed;
      }
    }
  }

  return options;
}

export async function loadSpeciesSeed() {
  const [seed, exceptions] = await Promise.all([
    readJson(SPECIES_SEED_PATH),
    readJson(SPECIES_EXCEPTIONS_PATH),
  ]);

  const displayOverrides = exceptions.displayNameOverrides ?? {};
  const aliases = exceptions.aliases ?? {};
  const species = (seed.species ?? []).map((row) => ({
    nationalDexNumber: row.nationalDexNumber,
    slug: row.slug,
    canonicalName: row.canonicalName,
    displayName: displayOverrides[row.slug] ?? row.displayName,
    searchTokens: [
      slugToSearchToken(row.slug),
      normalizeText(displayOverrides[row.slug] ?? row.displayName),
      ...(aliases[row.slug] ?? []).map(normalizeText),
    ].filter(Boolean),
  }));

  return {
    metadata: seed.metadata ?? {},
    exceptions,
    species,
  };
}

export function validateSpeciesSeed(seedBundle) {
  const errors = [];
  const warnings = [];
  const seenDexNumbers = new Map();
  const seenSlugs = new Map();

  for (const row of seedBundle.species) {
    if (!Number.isInteger(row.nationalDexNumber) || row.nationalDexNumber <= 0) {
      errors.push(`invalid_national_dex_number:${JSON.stringify(row)}`);
    }
    if (!row.slug || normalizeText(row.slug).length === 0) {
      errors.push(`invalid_slug:${JSON.stringify(row)}`);
    }
    if (!row.displayName || normalizeText(row.displayName).length === 0) {
      errors.push(`invalid_display_name:${JSON.stringify(row)}`);
    }
    if (seenDexNumbers.has(row.nationalDexNumber)) {
      errors.push(`duplicate_national_dex_number:${row.nationalDexNumber}`);
    }
    if (seenSlugs.has(row.slug)) {
      errors.push(`duplicate_slug:${row.slug}`);
    }
    seenDexNumbers.set(row.nationalDexNumber, row);
    seenSlugs.set(row.slug, row);
  }

  const expectedSpeciesCount = seedBundle.metadata.expectedSpeciesCount;
  if (Number.isInteger(expectedSpeciesCount) && seedBundle.species.length !== expectedSpeciesCount) {
    errors.push(`species_count_mismatch:expected=${expectedSpeciesCount}:actual=${seedBundle.species.length}`);
  }

  if (seedBundle.species.length < 1025) {
    errors.push(`species_seed_incomplete:actual=${seedBundle.species.length}:minimum=1025`);
  }

  for (const slug of Object.keys(seedBundle.exceptions.displayNameOverrides ?? {})) {
    if (!seenSlugs.has(slug)) {
      warnings.push(`display_override_without_species:${slug}`);
    }
  }

  for (const slug of Object.keys(seedBundle.exceptions.aliases ?? {})) {
    if (!seenSlugs.has(slug)) {
      warnings.push(`alias_without_species:${slug}`);
    }
  }

  return { errors, warnings };
}

export function buildSpeciesLookup(species) {
  const tokenEntries = [];
  for (const row of species) {
    for (const token of row.searchTokens) {
      if (token) {
        tokenEntries.push({ token, species: row });
      }
    }
  }

  tokenEntries.sort((left, right) => right.token.length - left.token.length);
  return tokenEntries;
}

export function classifyCardSpecies(card, tokenEntries, traitByCardPrintId) {
  const rawName = String(card.name ?? '');
  const normalizedName = normalizeText(card.name);
  if (!normalizedName) {
    return {
      status: 'unmapped',
      reason: 'missing_name',
      mappings: [],
    };
  }

  const trait = traitByCardPrintId.get(card.id) ?? null;
  const supertype = normalizeText(trait?.supertype);
  const cardCategory = normalizeText(trait?.card_category);
  const blockedByTrait = supertype === 'trainer' || supertype === 'energy' || cardCategory === 'trainer' || cardCategory === 'energy';

  const matches = [];
  for (const entry of tokenEntries) {
    const token = entry.token;
    if (!token) {
      continue;
    }
    const pattern = new RegExp(`(^| )${escapeRegExp(token)}($| )`, 'i');
    if (pattern.test(normalizedName) && !matches.some((match) => match.species.slug === entry.species.slug)) {
      matches.push(entry);
    }
  }

  if (matches.length === 0) {
    return {
      status: 'unmapped',
      reason: blockedByTrait ? 'blocked_trait_no_subject_match' : 'no_subject_match',
      mappings: [],
    };
  }

  const role = matches.length > 1 ? 'multi_subject' : /(?:'s|’s)\s+/i.test(rawName) ? 'trainer_owned' : 'primary';
  const countsForCompletion = !blockedByTrait;

  return {
    status: countsForCompletion ? 'mapped' : 'non_completion_candidate',
    reason: countsForCompletion ? 'name_token_match' : 'blocked_trait_subject_match',
    mappings: matches.map((match) => ({
      card_print_id: card.id,
      species_slug: match.species.slug,
      species_national_dex_number: match.species.nationalDexNumber,
      role,
      counts_for_completion: countsForCompletion,
      source: 'grookai_dex_name_rule_v1',
      confidence: role === 'primary' ? 0.82 : 0.72,
      evidence: {
        card_name: card.name,
        matched_token: match.token,
        supertype: trait?.supertype ?? null,
        card_category: trait?.card_category ?? null,
      },
    })),
  };
}

export function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function countBy(values, keyFn) {
  const counts = {};
  for (const value of values) {
    const key = keyFn(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
