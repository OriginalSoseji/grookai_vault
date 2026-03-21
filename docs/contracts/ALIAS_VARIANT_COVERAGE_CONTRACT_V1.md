# ALIAS_VARIANT_COVERAGE_CONTRACT_V1

## 1. Scope

This phase expands small, deterministic language coverage for the **web** resolver only.

It covers:
- safe set-code alias cleanup
- promo-family normalization
- compact/spaced promo token handling
- small variant phrase normalization
- gateway trace visibility for when coverage rules fire

It explicitly does **not** cover:
- scoring changes
- fuzzy matching
- large alias corpora
- AI
- schema or migration work
- mobile integration
- route redesign

## 2. Current Coverage Audit

### Existing set alias coverage before this phase
- `apps/web/src/lib/publicSets.shared.ts`
  - `SET_INTENT_ALIAS_MAP`
  - `STRUCTURED_CARD_SET_ALIAS_MAP`
- existing aliases already covered:
  - `pokemon 151`, `151`
  - `prismatic evolutions`, `pris evo`
  - `brilliant stars`, `brs`
  - `lost origin`, `lor`
  - `legendary treasures`, `ltr`
  - `silver tempest`, `sit`
  - `base set`
  - `obs`, `svi`
- `normalizeQuery.ts` after Normalization Contract V1 already surfaced:
  - matched alias phrases
  - set-like tokens such as `sv8`

### Existing promo coverage before this phase
- `normalizeQuery.ts`
  - compacted spaced promo-family forms into single tokens
    - `swsh 020 -> swsh020`
    - `svp 123 -> svp123`
  - extracted promo tokens from alpha+digit compact forms
- gap:
  - promo-family extraction existed, but set-family promotion to resolver-visible expected set codes was thin and not fully guarded against false positives

### Existing variant coverage before this phase
- ranked resolver recognized only a narrow deterministic cue family through `getExploreRows.ts`
  - `alt art`
  - `alternate art`
  - `full art`
  - `black star promo`
  - `black star`
  - single tokens:
    - `promo`
    - `holo`
    - `rainbow`
    - `gold`
- normalization layer already covered:
  - `reverse holo`
  - `rev holo`
  - `fullart`
  - `alternate art`
- gaps:
  - hyphenated forms were not centralized
  - compact reverse-holo forms were not normalized
  - coverage firing was not explicit in logs

### Key gaps found
- zero-padded set shorthand such as `sv8` was recognized only as a set-like token, not promoted into `expectedSetCodes`
- promo-family mapping could be too permissive without digit guards
- hyphenated or compact variant forms such as:
  - `alt-art`
  - `full-art`
  - `reverse-holo`
  - `reverseholo`
  - `revholo`
  were not fully centralized
- direct resolver could not benefit from normalized set-code coverage unless those normalized set codes were explicitly fed into `publicSearchResolver.ts`

## 3. Coverage Rules Added

### Set alias rules
Added in `apps/web/src/lib/resolver/normalizeQuery.ts`:
- zero-padded `sv` shorthand canonicalization
  - `sv8 -> sv08`
  - `sv3.5 -> sv03.5`
- direct set-code promotion into `expectedSetCodes` for safe set-code token classes
  - `sv08`
  - `swsh7`
  - `sm12`
  - `xy6`
  - similar already-supported code families

This phase did **not** add a large new alias dictionary.

### Promo normalization rules
Added in `normalizeQuery.ts`:
- promo-family to set-code mapping
  - `swsh020 -> expectedSetCodes: swshp`
  - `svp123 -> expectedSetCodes: svp`
  - equivalent compact spaced forms continue to work
- minimum-digit guards by family to avoid false positives
  - example: `swsh7` is no longer treated as a promo-family token

### Variant normalization rules
Added in `normalizeQuery.ts`:
- `reverse-holo -> reverse`
- `reverseholo -> reverse`
- `revholo -> reverse`
- `alt-art -> alt art`
- `full-art -> full art`
- `black-star promo -> promo`
- `black-star -> promo`

Existing safe forms remained:
- `reverse holo`
- `rev holo`
- `fullart`
- `alternate art`
- `promo`
- `holo`
- `rainbow`
- `gold`

### Synonym rules
- No broad synonym layer was added.
- Only small deterministic phrase-to-token normalization grounded in current resolver vocabulary was added.

## 4. Integration Points

Files touched:
- `apps/web/src/lib/resolver/normalizeQuery.ts`
- `apps/web/src/lib/resolver/resolveQuery.ts`
- `apps/web/src/lib/publicSearchResolver.ts`

How `normalizeQuery.ts` remains authoritative:
- all live web resolver traffic still enters through `resolveQuery.ts`
- `resolveQuery.ts` builds one normalized packet
- direct resolver consumes the packet via `resolvePublicSearchPacketWithTiming(packet)`
- ranked resolver continues to consume the packet via `getExploreRowsPacketWithTiming(packet, ...)`

Additional integration added in this phase:
- `publicSearchResolver.ts`
  - now consumes `expectedSetCodes` and `setConsumedTokens` from the packet
  - `buildSetContext(...)` merges packet-derived set codes with phrase/name-derived set context
  - `resolveSetIntent(...)` can now return a set for pure normalized set-token queries when exactly one packet-derived set code is present and all tokens are set tokens

No scoring weights or ranking formulas were changed.

## 5. Observability Added

Gateway tracing in `apps/web/src/lib/resolver/resolveQuery.ts` now includes:
- `coverageSignals.setRules`
- `coverageSignals.promoRules`
- `coverageSignals.variantRules`

This means the resolver trace now shows when language coverage fired, not just the normalized output fields.

Examples of visible signals:
- `set_token:sv8->sv08`
- `promo_family:swsh->swshp`
- `variant:fullart->full art`
- `variant:reverse-holo->reverse`

## 6. Verification

### Exact queries tested
- `charizard sv8 223`
- `pikachu swsh 020`
- `pikachu svp 123`
- `charizard fullart 4/102`
- `gyarados reverse-holo 6/102`
- `blastoise revholo 2/102`
- `umbreon alt-art swsh7 95`
- `pikachu pokemon 151 025/165`

### Exact commands run
```powershell
cd C:\grookai_vault\apps\web
npm run typecheck
npx eslint src/lib/resolver/normalizeQuery.ts src/lib/resolver/resolveQuery.ts src/lib/publicSearchResolver.ts src/lib/explore/getExploreRows.ts
@'
import mod from './src/lib/resolver/normalizeQuery.ts';
const { normalizeQuery } = mod;
const queries = [
  'charizard sv8 223',
  'pikachu swsh 020',
  'pikachu svp 123',
  'charizard fullart 4/102',
  'gyarados reverse-holo 6/102',
  'blastoise revholo 2/102',
  'umbreon alt-art swsh7 95',
  'pikachu pokemon 151 025/165'
];
for (const query of queries) {
  const packet = normalizeQuery(query);
  console.log(JSON.stringify({
    query,
    expectedSetCodes: packet.expectedSetCodes,
    promoTokens: packet.promoTokens,
    possibleSetTokens: packet.possibleSetTokens,
    variantTokens: packet.variantTokens,
    coverageSignals: packet.coverageSignals,
  }));
}
'@ | npx tsx -
```

### Exact outcomes
- `npm run typecheck`
  - passed
- targeted `eslint`
  - passed

Regression query outputs:
- `charizard sv8 223`
  - `expectedSetCodes: ["sv08"]`
  - `coverageSignals.setRules: ["set_token:sv8->sv08"]`
- `pikachu swsh 020`
  - `promoTokens: ["SWSH020"]`
  - `expectedSetCodes: ["swshp"]`
  - `coverageSignals.promoRules: ["promo_family:swsh->swshp"]`
- `pikachu svp 123`
  - `promoTokens: ["SVP123"]`
  - `expectedSetCodes: ["svp"]`
- `charizard fullart 4/102`
  - `variantTokens: ["full art"]`
  - `coverageSignals.variantRules: ["variant:fullart->full art"]`
- `gyarados reverse-holo 6/102`
  - `variantTokens: ["reverse","holo"]`
  - `coverageSignals.variantRules` includes `variant:reverse-holo->reverse`
- `blastoise revholo 2/102`
  - `variantTokens: ["reverse"]`
  - `coverageSignals.variantRules: ["variant:revholo->reverse"]`
- `umbreon alt-art swsh7 95`
  - `expectedSetCodes: ["swsh7"]`
  - `promoTokens: []`
  - confirms the false promo-family hit was removed
- `pikachu pokemon 151 025/165`
  - `expectedSetCodes: ["sv03.5"]`
  - `coverageSignals.setRules` includes `alias:151` and `alias:pokemon 151`

## 7. Risks / Non-Goals

### Risks
- packet-level language expansion can still influence candidate visibility indirectly by exposing stronger deterministic signals to existing resolver logic
- set-family promotion must remain tightly constrained to already-supported set-code families

### Non-goals
- no scoring changes
- no fuzzy matching
- no AI
- no mobile changes
- no giant alias campaign
- no broad synonym project

This phase intentionally stayed small:
- only safe set-code normalization
- only safe promo-family normalization
- only small grounded variant phrase normalization

