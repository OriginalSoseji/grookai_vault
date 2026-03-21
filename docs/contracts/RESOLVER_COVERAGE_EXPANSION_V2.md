# RESOLVER_COVERAGE_EXPANSION_V2

## 1. Scope

This phase expands deterministic resolver language coverage for a small, observed weak-query set.

Covered:
- targeted special-family phrase normalization
- targeted promo-family shorthand expansion
- targeted phrase bridging into existing structured resolver fields
- additional coverage trace signals

Not covered:
- scoring changes
- normalization architecture rewrite
- fuzzy matching
- AI
- mobile integration
- schema or migration changes
- large alias-table growth

This phase remains fully inside the existing normalization authority:
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)

## 2. Failure Query Set

Resolver logs are currently visible through gateway tracing, but there is no persisted query-log store in the repo. Because of that, this phase used a small manual working set grounded in:
- known weak examples already documented in:
  - [RESOLVER_UX_AMBIGUITY_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/RESOLVER_UX_AMBIGUITY_CONTRACT_V1.md)
  - [SCORING_CONTRACT_V1.md](/c:/grookai_vault/docs/contracts/SCORING_CONTRACT_V1.md)
- additional closely related domain queries used as safety checks

Working set used:
- `greninja gold star`
- `charizard gold star`
- `mew gold star`
- `pikachu sv promo`
- `pikachu scarlet violet promo`
- `pikachu svp promo`
- `pikachu sv black star promo`
- `pikachu swsh020` (control)
- `charizard 4/102 base` (control)
- `greninja star` (guard against over-expansion)

Failure-type classification:

| Query class | Example queries | Failure type |
| --- | --- | --- |
| Gold Star family | `greninja gold star`, `charizard gold star`, `mew gold star` | special card family phrase not normalized into the printed-symbol form present in canonical card names |
| Scarlet & Violet promo shorthand | `pikachu sv promo`, `pikachu scarlet violet promo`, `pikachu sv black star promo` | promo-family shorthand missing deterministic set-family expansion |
| Exact promo family token | `pikachu svp promo` | safe family shorthand token not promoted into `expectedSetCodes` |
| Over-expansion guard | `greninja star` | incomplete phrase should remain weak; no safe deterministic expansion exists |
| Strong controls | `pikachu swsh020`, `charizard 4/102 base` | should remain unchanged and strong |

## 3. Coverage Rules Added

### Rule: `gold star -> ★`

Why it exists:
- current repo data already contains star-family cards with the printed star symbol in the card name, for example:
  - `Greninja ★`
  - `Charizard ★ δ`
  - `Mew ★ δ`
- before this phase, `gold star` queries remained weak because the query language never reached that printed-name form

What it fixes:
- `greninja gold star`
- `charizard gold star`
- `mew gold star`

How it works:
- a special-family phrase rewrite converts `gold star` into `★` in the normalized query string
- this improves exact or prefix name alignment without changing scoring logic

Trace signal:
- `specialRules: ["special_family:gold star->★"]`

### Rule: `sv promo -> svp`

Why it exists:
- `sv promo` is a real-world shorthand for Scarlet & Violet promos
- before this phase, it produced only a generic `promo` variant cue and no set-family evidence

What it fixes:
- `pikachu sv promo`

How it works:
- family detection promotes `sv promo` into:
  - `expectedSetCodes: ["svp"]`
  - `possibleSetTokens: ["sv promo"]`
  - `setConsumedTokens: ["sv"]`

Trace signal:
- `familyRules: ["family_phrase:sv promo->svp"]`

### Rule: `scarlet violet promo -> sv promo`

Why it exists:
- the long-form promo-family phrase is the same resolver intent as `sv promo`
- before this phase, those extra words leaked into ranked matching as noise and kept the query weak

What it fixes:
- `pikachu scarlet violet promo`

How it works:
- a special-family phrase rewrite converts:
  - `scarlet violet promo`
  - `scarlet and violet promo`
  - `scarlet & violet promo`
  - and black-star variants of the same phrase
  into `sv promo`
- the existing family detection then promotes `sv promo -> svp`

Trace signals:
- `specialRules: ["special_family:scarlet violet promo->sv promo"]`
- `familyRules: ["family_phrase:sv promo->svp"]`

### Rule: `sv black star promo -> sv promo`

Why it exists:
- this is the same promo-family intent as `sv promo`, with extra surface words that should not create a separate weak class

What it fixes:
- `pikachu sv black star promo`

How it works:
- special-family phrase rewrite converts `sv black star promo` into `sv promo`
- existing family detection promotes `sv promo -> svp`

Trace signals:
- `specialRules: ["special_family:sv promo->sv promo"]`
- `familyRules: ["family_phrase:sv promo->svp"]`

### Rule: `svp -> svp`

Why it exists:
- exact family shorthand tokens like `svp` were safe but previously not promoted into `expectedSetCodes`

What it fixes:
- `pikachu svp promo`

How it works:
- shorthand detection promotes token `svp` into:
  - `expectedSetCodes: ["svp"]`
  - `possibleSetTokens: ["svp"]`

Trace signal:
- `shorthandRules: ["set_shorthand:svp->svp"]`

### Symmetric Sword & Shield promo bridge

Why it exists:
- the same family-phrase pattern exists on the Sword & Shield side and can be handled safely with the same deterministic model

What it fixes:
- `pikachu sword and shield promo`

How it works:
- `sword shield promo` and `sword and shield promo` normalize to `swsh promo`
- family detection promotes `swsh promo -> swshp`

Trace signals:
- `specialRules: ["special_family:sword shield promo->swsh promo"]`
- `familyRules: ["family_phrase:swsh promo->swshp"]`

## 4. Integration

Integration remains centralized through:
- [normalizeQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/normalizeQuery.ts)

Flow:
1. special-family phrase rewrites are applied to the raw query’s normalized form
2. the rewritten query continues through the existing normalization pipeline
3. new family/shorthand hints are merged into existing structured outputs only:
   - `expectedSetCodes`
   - `possibleSetTokens`
   - `setConsumedTokens`
4. existing resolver consumers continue to read the same packet fields:
   - [resolveQuery.ts](/c:/grookai_vault/apps/web/src/lib/resolver/resolveQuery.ts)
   - [publicSearchResolver.ts](/c:/grookai_vault/apps/web/src/lib/publicSearchResolver.ts)
   - [getExploreRows.ts](/c:/grookai_vault/apps/web/src/lib/explore/getExploreRows.ts)

Important boundary:
- this phase did not create any parallel interpretation path
- it only enriches the existing normalization packet

## 5. Observability

New `coverageSignals` categories added:
- `specialRules`
- `shorthandRules`
- `familyRules`

These sit alongside the existing:
- `setRules`
- `promoRules`
- `variantRules`

This now makes the following visible in resolver traces:
- when a special-family rewrite fired
- when a shorthand-family token fired
- when a promo-family phrase bridge fired

## 6. Verification

Commands run:

```powershell
cd C:\grookai_vault\apps\web
npm run typecheck
npx eslint src/lib/resolver/normalizeQuery.ts src/lib/resolver/resolveQuery.ts
```

Outcomes:
- `npm run typecheck` passed
- targeted `eslint` passed

Ranked verification run:

```powershell
cd C:\grookai_vault
@'
import { resolveQueryWithMeta } from '@/lib/resolver/resolveQuery';
const queries = [
  'greninja gold star',
  'charizard gold star',
  'mew gold star',
  'pikachu sv promo',
  'pikachu scarlet violet promo',
  'pikachu svp promo',
  'pikachu sv black star promo',
  'pikachu swsh020',
  'charizard 4/102 base',
  'greninja star'
];
for (const query of queries) {
  const resolved = await resolveQueryWithMeta(query, { mode: 'ranked', sortMode: 'relevance', exactSetCode: '' });
  console.log(JSON.stringify({
    query,
    resolverState: resolved.meta.resolverState,
    topScore: resolved.meta.topScore,
    candidateCount: resolved.meta.candidateCount,
    top: resolved.rows[0] ? { gv_id: resolved.rows[0].gv_id, name: resolved.rows[0].name, set_code: resolved.rows[0].set_code, number: resolved.rows[0].number } : null
  }));
}
'@ | node --loader ./tools/resolver/ts_web_loader.mjs --input-type=module -
```

Before vs after state changes:

| Query | Before | After | Result summary |
| --- | --- | --- | --- |
| `greninja gold star` | `WEAK_MATCH` | `STRONG_MATCH` | now resolves to `Greninja ★ • swshp • #SWSH144` |
| `charizard gold star` | `WEAK_MATCH` | `AMBIGUOUS_MATCH` | now surfaces `Charizard ★ δ` at top without false strong certainty |
| `mew gold star` | `WEAK_MATCH` | `AMBIGUOUS_MATCH` | now surfaces `Mew ★ δ` at top without false strong certainty |
| `pikachu sv promo` | `WEAK_MATCH` | `AMBIGUOUS_MATCH` | now prefers `Pikachu • svp • #101` with `expectedSetCodes: ["svp"]` |
| `pikachu scarlet violet promo` | `WEAK_MATCH` | `AMBIGUOUS_MATCH` | phrase bridge now collapses to `sv promo` and prefers SVP candidates |
| `pikachu svp promo` | `WEAK_MATCH` | `AMBIGUOUS_MATCH` | exact `svp` shorthand now feeds `expectedSetCodes: ["svp"]` |
| `pikachu sv black star promo` | `WEAK_MATCH` | `AMBIGUOUS_MATCH` | black-star wording now bridges into the SVP family |

Control and safety outcomes:
- `pikachu swsh020`
  - remained `STRONG_MATCH`
- `charizard 4/102 base`
  - remained `STRONG_MATCH`
- `greninja star`
  - remained `WEAK_MATCH`
  - this is intentional and proves the phase did not broaden from `gold star` into unsafe generic `star`

## 7. Risks / Non-Goals

Intentional non-goals:
- no scoring changes
- no fuzzy matching
- no AI
- no mobile work
- no broad alias campaign
- no giant family dictionary

Known limits after this phase:
- only observed, safe language classes were expanded
- this does not claim exhaustive family coverage
- some weak queries will remain weak until additional repo-grounded evidence justifies further deterministic coverage

Why this phase stayed small:
- deterministic explainability must remain intact
- the normalization authority must stay centralized
- weak-query fixes must be auditable as explicit rule additions, not hidden behavior drift
