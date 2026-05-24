import { DEFAULT_PILOT_SETS, NAMED_STRESS_PILOTS } from '../shared.mjs';

const ALL_SETS = [...DEFAULT_PILOT_SETS, ...NAMED_STRESS_PILOTS];

const SET_ALIASES = new Map(ALL_SETS.flatMap((set) => [
  [set.key, set],
  set.tcgdex ? [set.tcgdex, set] : null,
  set.pokemontcg ? [set.pokemontcg, set] : null,
  set.source_aliases?.tcgdex ? [set.source_aliases.tcgdex, set] : null,
  set.source_aliases?.pokemontcg_io ? [set.source_aliases.pokemontcg_io, set] : null,
].filter(Boolean)));

function validateKnownSetFinishProfile(set) {
  if (!set.set_name) return;
  if (!set.finish_profile) {
    throw new Error(`Named pilot ${set.key} must declare a source-backed finish_profile before finish reports can run.`);
  }
  const profile = set.finish_profile;
  if (profile.source_backed !== true) {
    throw new Error(`Named pilot ${set.key} finish_profile must be source_backed=true.`);
  }
  if (!profile.source_url) {
    throw new Error(`Named pilot ${set.key} finish_profile must include source_url.`);
  }
  if (!Array.isArray(profile.focus_finishes) || profile.focus_finishes.length === 0) {
    throw new Error(`Named pilot ${set.key} finish_profile must include focus_finishes.`);
  }
  if (
    profile.focus_finishes.includes('masterball')
    && !profile.masterball_source_url
  ) {
    throw new Error(`Named pilot ${set.key} cannot include masterball without an explicit masterball_source_url.`);
  }
}

function customSetFromToken(token) {
  return {
    key: token,
    tcgdex: token,
    pokemontcg: token,
    label: 'custom_unmapped',
    source_aliases: {
      tcgdex: token,
      pokemontcg_io: token,
    },
    source_status: {
      tcgdex: 'alias_provided',
      pokemontcg_api: 'alias_provided',
    },
  };
}

function customSetFromPair(tcgdex, pokemontcg) {
  return {
    key: pokemontcg,
    tcgdex,
    pokemontcg,
    label: 'custom',
    source_aliases: {
      tcgdex,
      pokemontcg_io: pokemontcg,
    },
    source_status: {
      tcgdex: 'alias_provided',
      pokemontcg_api: 'alias_provided',
    },
  };
}

export function resolvePilotSets(setArg) {
  if (!setArg) return DEFAULT_PILOT_SETS;
  return setArg
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const pairParts = token.split(':').map((part) => part.trim());
      if (pairParts.length === 2 && pairParts[0] && pairParts[1]) {
        return customSetFromPair(pairParts[0], pairParts[1]);
      }
      const known = SET_ALIASES.get(token);
      if (known) {
        validateKnownSetFinishProfile(known);
        return known;
      }
      return customSetFromToken(token);
    });
}

for (const set of NAMED_STRESS_PILOTS) {
  validateKnownSetFinishProfile(set);
}
