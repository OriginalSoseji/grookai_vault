import { classifyCrossTcgSealedProductV1 } from './cross_tcg_sealed_product_identity_v1.mjs';
import { createSealedWorldPolicyV1 } from './sealed_world_policy_v1.mjs';

export const POKEMON_SEALED_WORLD_V1 = 'POKEMON_SEALED_WORLD_V1';
export const POKEMON_SEALED_CATEGORY_IDS = Object.freeze([3, 85]);
const languageMarkers = Object.freeze({ english: 'en', japanese: 'ja', chinese: 'zh',
  french: 'fr', german: 'de', italian: 'it', korean: 'ko', portuguese: 'pt', spanish: 'es', russian: 'ru' });

export function pokemonSealedLanguageV1(row) {
  const name = String(row.name ?? '');
  const explicit = Object.entries(languageMarkers).filter(([label]) =>
    new RegExp(`\\b${label}\\b`, 'i').test(name));
  if (explicit.length > 1) return { code: null, authority: 'conflicting_language_markers', source_value: name };
  if (explicit.length === 1) return { code: explicit[0][1],
    authority: 'explicit_source_product_name', source_value: explicit[0][0] };
  const category = Number(row.category_id);
  if (category === 85) return { code: 'ja', authority: 'tcgplayer_pokemon_japan_category', source_value: row.category_display_name };
  if (category === 3) return { code: 'en', authority: 'tcgplayer_pokemon_english_source_lane', source_value: row.category_display_name };
  return { code: null, authority: 'unknown_source_language', source_value: row.category_display_name };
}

export function classifyPokemonSealedProductV1(row) {
  const base = classifyCrossTcgSealedProductV1(row);
  if (!POKEMON_SEALED_CATEGORY_IDS.includes(Number(row.category_id)) ||
      ['nonsealed_card', 'excluded_non_tcg_product'].includes(base.classification) ||
      base.evidence.some(item => item.code === 'custom_or_retailer_signal')) return base;
  const name = String(row.name ?? '');
  const content = (row.extended_data ?? []).map(item => String(item.value ?? '')).join(' ').replace(/<[^>]*>/g, ' ');
  const hasPacks = /\b\d+\s+(?:[A-Za-z&-]+\s+){0,6}booster\s+packs?\b/i.test(content);
  let form = base.candidate_identity.package_form;
  let reason = null;
  // Package counts and exact names remain intact; a multi-pack blister is a bundle.
  if (/\bblisters?\b/i.test(name) && hasPacks) {
    form = /\b(?:single|one|1)[ -](?:pack[ -])?blister\b/i.test(name) ? 'pack' : 'bundle';
    reason = 'pokemon_blister_with_explicit_booster_contents';
  } else if (/\b(?:collection|box)\b/i.test(name) && hasPacks && !form) {
    form = 'collection'; reason = 'pokemon_collection_with_explicit_booster_contents';
  } else if (/\btrainer kit\b/i.test(name)) {
    form = 'kit'; reason = 'pokemon_trainer_kit_exact_package';
  } else if (/\bbattle arena decks?\b/i.test(name)) {
    form = 'deck'; reason = 'pokemon_battle_arena_deck_exact_package';
  } else if (/\bcollector(?:s|['\u2019]s)? chest\b/i.test(name)) {
    form = /\bcase\b/i.test(name) ? 'case' : 'collection';
    reason = 'pokemon_collector_chest_exact_package';
  }
  if (!reason) return base;
  return { ...base, policy_version: POKEMON_SEALED_WORLD_V1,
    classification: 'sealed_candidate', confidence: hasPacks ? 0.99 : 0.92,
    candidate_identity: { ...base.candidate_identity, package_form: form },
    evidence: [...base.evidence, { code: reason, field: hasPacks ? 'name+extended_data' : 'name',
      value: hasPacks ? `${name} | ${content}` : name, strength: 'strong' }],
    reasons: [reason], requires_human_review: false };
}

const policy = createSealedWorldPolicyV1({ gameKey: 'pokemon',
  categoryIds: POKEMON_SEALED_CATEGORY_IDS, version: POKEMON_SEALED_WORLD_V1,
  manufacturer: null, languages: Object.values(languageMarkers),
  language: pokemonSealedLanguageV1, classify: classifyPokemonSealedProductV1,
  strictPositivePrice: true });
export const buildPokemonSealedWorldPlanV1 = policy.buildPlan;
export const validatePokemonSealedWorldPlanV1 = policy.validatePlan;
export const pokemonSealedHashV1 = policy.hash;
export const POKEMON_SEALED_REVIEWER_ID = policy.reviewerId;
