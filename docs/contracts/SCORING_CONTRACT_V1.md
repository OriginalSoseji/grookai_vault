# SCORING_CONTRACT_V1

## 1. Scope

This phase hardens deterministic ranked scoring for the web resolver only.

Covered:
- explicit scoring priorities in [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- stronger structured-evidence ranking for ranked `/explore` resolution
- score-component tracing at the resolver gateway

Not covered:
- direct `/search` identity resolution logic
- fuzzy matching
- AI interpretation
- mobile search
- schema or migration changes
- UX redesign
- alias expansion beyond the already-centralized normalization packet

## 2. Current Scoring Audit

Ranked scoring authority before this phase lived entirely in [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts).

Current factors before hardening:
- direct `gv_id` exact hit: `+6000`
- exact normalized name: `+2200` or `+1500` with strong disambiguator
- exact combined `name + set`: `+1900` or `+1300`
- name prefix: `+1500` or `+950`
- text-token similarity: `+70` to `+280`
- all text tokens matched: `+360`
- set token similarity: `+150` to `+260`
- expected set code match: `+880`
- expected set code miss: `-360`
- exact collector number match: `+1600`
- digit-only number match: `+1120`
- partial `gv_id`/number lane match: `+760`
- number miss when query had a number: `-520`
- variant cue match:
  - `alt_art +720`
  - `rainbow +620`
  - `promo +520`
  - `gold +320`
  - `full_art +320`
  - `holo +220`
- variant miss when cues existed: `-240`

Tie-break behavior before and after this phase remains:
1. score
2. `name`
3. `set_name`
4. `number`
5. `gv_id`

Weaknesses proven in the code audit:
- strong structured evidence existed, but it was not formalized as a contract
- exact-name bonuses with strong disambiguators were still large enough to compete with structured signals
- fraction tokens were parsed by normalization but not scored in ranked search
- promo tokens were parsed by normalization but not scored explicitly in ranked search
- reverse-holo normalization existed, but ranked cue mapping dropped `reverse`
- ranked traces exposed candidate count and timing, but not why the winning result won

Known repo-grounded weakness that remains outside this phase:
- some intent classes still do not produce strong deterministic evidence at normalization time, for example `gold star` and `sv promo`; scoring cannot safely invent that missing evidence

## 3. Scoring Contract V1

Ranking principles locked in this phase:
- structured identity-shaping evidence must materially outrank broad name overlap
- strong query disambiguators must reduce reliance on exact-name dominance
- exact set, number, fraction, promo, and variant evidence must be visible in score components
- ranked search may rank ambiguous candidates, but it may not silently collapse ambiguity into forced identity certainty

Factor priority locked:
1. direct `gv_id` exact hit
2. exact collector number match
3. exact fraction match
4. expected set code match
5. promo-token exact or promo-family match
6. strong variant cue match
7. exact/near-exact name and token overlap

Penalties and guardrails locked:
- expected set code miss is stronger than before
- collector number miss is stronger than before when the query clearly contains one
- fraction miss is penalized when the query clearly contains a fraction token
- promo-token miss is penalized when the query clearly contains a promo token
- candidates with no structured match are penalized when the query clearly carried structured disambiguators
- variant miss remains a penalty and now also accounts for `reverse`

Ambiguity rules preserved:
- ranked search still returns candidates; it does not auto-resolve identity based on score alone
- direct resolver behavior remains separate and intentionally unchanged

## 4. Implementation Changes

Files changed in this phase:
- [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)
- [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)

What changed in ranked scoring:
- made structured-evidence weights explicit constants instead of leaving them implicit inside one large scoring block
- reduced exact-name dominance when the query already carries strong disambiguators
- increased emphasis on:
  - expected set code match
  - exact collector number match
  - exact fraction match
  - promo token match
- added a structured-query penalty when a candidate wins on broad overlap but matches none of the structured evidence
- added explicit `reverse` cue consumption in ranked scoring
- added set `printed_total` lookup so fraction tokens like `4/102` can materially score in ranked search

What remained intentionally unchanged:
- direct resolver logic in [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
- candidate retrieval fanout in ranked search
- ranking tie-break order
- route shapes and response shapes
- alias dictionaries
- normalization packet semantics outside what the ranked scorer now consumes

## 5. Observability Added

Resolver tracing in [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts) now exposes:
- top ranked `gv_id`
- top score
- top score components
- whether the winning result matched:
  - expected set evidence
  - number evidence
  - fraction evidence
  - promo evidence
  - variant evidence

This closes the previous debugging gap where ranking could be observed only as an output list, not as an explainable winner.

## 6. Verification

Commands run:

```powershell
cd C:\grookai_vault\apps\web
npm run typecheck
npx eslint src/lib/explore/getExploreRows.ts src/lib/resolver/resolveQuery.ts
```

Outcomes:
- `npm run typecheck` passed
- targeted `eslint` passed

Targeted ranked query verification run:

```powershell
cd C:\grookai_vault
@'
import { resolveQuery } from '@/lib/resolver/resolveQuery';
const queries = [
  'gardevoir ex sv01 245',
  'pikachu swsh020',
  'professor''s research swsh152',
  'umbreon vmax alt art',
  'gyarados reverse holo base',
  'charizard 4/102 base',
  'greninja gold star',
  'pikachu sv promo'
];
for (const query of queries) {
  const rows = await resolveQuery(query, { mode: 'ranked', sortMode: 'relevance', exactSetCode: '' });
  const top = rows[0];
  console.log(JSON.stringify({
    query,
    top: top ? { gv_id: top.gv_id, name: top.name, set_code: top.set_code, number: top.number, variant_key: top.variant_key } : null
  }));
}
'@ | node --loader ./tools/resolver/ts_web_loader.mjs --input-type=module -
```

Observed outcomes:
- `gardevoir ex sv01 245` -> top `GV-PK-SVI-245`
  - winning evidence: exact set + exact number
- `pikachu swsh020` -> top `GV-PK-PR-SW-SWSH020`
  - winning evidence: promo family + exact promo token + exact number
- `professor's research swsh152` -> top `GV-PK-PR-SW-SWSH152`
  - winning evidence: promo family + exact promo token + exact number
- `umbreon vmax alt art` -> top `GV-PK-EVS-95`
  - winning evidence: exact name overlap + `alt_art`
- `gyarados reverse holo base` -> top `GV-PK-BS-6`
  - winning evidence: expected set + set token + holo cue
- `charizard 4/102 base` -> top `GV-PK-BS-4`
  - winning evidence: expected set + exact number + exact fraction

Observed unresolved but explicit cases:
- `greninja gold star` still tops a weak name-overlap candidate because current deterministic normalization does not produce a safe `gold star` structured identity signal
- `pikachu sv promo` remains weak because current normalization does not convert `sv promo` into a specific promo-family set expectation

## 7. Risks / Non-Goals

Intentional non-goals in this phase:
- no fuzzy matching
- no AI normalization
- no mobile resolver work
- no search UX changes
- no candidate-fetch reduction
- no alias expansion campaign beyond what already exists in normalization authority

Known risk after this phase:
- scoring is now more explainable and better aligned to structured evidence, but some weak-query classes still lack deterministic preprocessing signals; those are normalization/coverage problems, not scoring problems
- network latency and request fanout are unchanged by this phase

Why those were not touched:
- the contract for this phase was ranking only
- identity honesty required keeping direct resolution separate
- alias growth and retrieval changes need their own audited contract phases
