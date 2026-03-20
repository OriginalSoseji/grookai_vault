# NORMALIZATION_CONTRACT_V1

## 1. Scope

This phase centralizes deterministic query preprocessing for the **web** resolver path behind one normalization module:
- `apps/web/src/lib/resolver/normalizeQuery.ts`

This phase covers:
- lowercase and whitespace normalization
- safe punctuation cleanup for resolver parsing
- centralized token extraction
- collector number extraction
- fraction extraction
- promo token extraction
- light variant token normalization
- light set token normalization
- resolver gateway integration
- normalization trace logging

This phase does **not** cover:
- scoring changes
- alias expansion beyond existing safe deterministic logic
- candidate retrieval redesign
- mobile search consolidation
- route redesign
- AI
- schema or migration changes

## 2. Current Normalization Audit

### Where normalization existed before
- `apps/web/src/lib/publicSearchRouting.ts`
  - `normalizeSearchInput`
  - structured-query classification helpers
- `apps/web/src/lib/publicSearchResolver.ts`
  - `normalizeFallbackQuery`
  - `normalizeResolverInput`
  - `splitTokens`
  - `normalizeDigits`
  - `normalizeGvIdInput`
  - `parseCollectorFraction`
  - `parsePrintedNumberToken`
- `apps/web/src/lib/explore/getExploreRows.ts`
  - `normalizeFreeTextQuery`
  - `normalizeTextForMatch`
  - `tokenizeNormalizedQuery`
  - `tokenizeQuerySegments`
  - `normalizeCollectorToken`
  - `normalizeDigits`
  - `detectSetExpectations`
  - `detectVariantCues`
  - `buildCollectorNumberExpectations`
- `apps/web/src/components/explore/ExplorePageClient.tsx`
  - local `normalizeFreeTextQuery` for query cleanup before invoking resolver

### Duplication found
- whitespace cleanup existed in:
  - `publicSearchRouting.ts`
  - `publicSearchResolver.ts`
  - `getExploreRows.ts`
  - `ExplorePageClient.tsx`
- collector-number parsing existed in:
  - `publicSearchResolver.ts`
  - `getExploreRows.ts`
- variant cue parsing existed only in `getExploreRows.ts`, not in the gateway
- set alias/set expectation parsing existed in:
  - `publicSearchRouting.ts`
  - `getExploreRows.ts`
  - `publicSearchResolver.ts` via `buildSetContext`

### Inconsistencies found
- direct resolver and ranked resolver were not consuming one authoritative normalized packet
- `ExplorePageClient` pre-normalized the query before calling the gateway, which meant client code still influenced authoritative preprocessing
- direct resolver used one lowercase/cleanup shape (`normalizeResolverInput`)
- ranked resolver used a different preserved-case trimmed query plus local text normalization
- promo token extraction was implicit, not centralized
- reverse/full-art surface forms were not normalized at the gateway level

## 3. Normalization Packet Design

### File path
- `apps/web/src/lib/resolver/normalizeQuery.ts`

### Function signature
- `normalizeQuery(rawQuery: string): NormalizedQueryPacket`

### Returned fields
- `rawQuery`
  - preserves the exact incoming query for traceability
- `normalizedQuery`
  - trimmed and whitespace-collapsed query string
  - used as the canonical display/query string for downstream resolver paths
- `normalizedResolverInput`
  - lowercased and token-cleaned string matching direct resolver expectations
- `normalizedTokens`
  - stable alphanumeric token list for ranked resolver text parsing
- `compactTokens`
  - token segments preserving slash forms and safe compact joins such as `svp123`
- `numberTokens`
  - normalized collector/promotional number tokens for traceability
- `numberDigitTokens`
  - digit-only equivalents used by existing ranked logic
- `fractionTokens`
  - normalized fraction strings such as `043/198`
- `promoTokens`
  - normalized promo-family tokens such as `SWSH020`, `SVP123`
- `possibleSetTokens`
  - safe set-code or alias phrase signals derived from existing deterministic logic
- `expectedSetCodes`
  - set-code candidates from existing structured set alias rules
- `setConsumedTokens`
  - set tokens that should not double-count as plain text in ranking preprocessing
- `variantTokens`
  - centralized stable variant terms for logging and ranked cue derivation
- `variantConsumedTokens`
  - variant tokens that should not double-count as plain text
- `normalizedGvId`
  - canonical Grookai ID interpretation when present
- `collectorExpectations`
  - structured collector-number expectations consumed by ranked resolver
- `hasStrongDisambiguator`
  - deterministic boolean summarizing whether strong parsing signals exist

### Why each field exists
- The packet separates preprocessing from ranking.
- It centralizes parsing outputs that were previously recomputed in multiple places.
- It allows direct and ranked resolver paths to consume the same deterministic inputs without changing their output shape.

## 4. Normalization Rules Implemented

### Lowercase
- `normalizedResolverInput`
  - lowercases query text for direct resolver parsing
- token extraction also lowercases for normalized token families

### Whitespace
- repeated whitespace collapses to a single space
- leading and trailing whitespace is trimmed

### Punctuation
- safe token-edge punctuation cleanup is applied for direct resolver parsing
- alphanumeric and slash-bearing query segments are preserved where needed for collector fractions and promo tokens

### Tokenization
- `normalizedTokens`
  - alphanumeric words via `[a-z0-9]+`
- `compactTokens`
  - slash-preserving segments via `[a-z0-9/]+`
  - plus safe compact joins for known prefixes such as `svp 123 -> svp123`

### Number normalization
- pure numeric collector values centralize equivalent forms
  - `043` contributes `043` and `43` into traceable number tokens
  - `43` remains `43`
- prefixed collector values are normalized as uppercase compact tokens
  - `tg23 -> TG23`
  - `gg15 -> GG15`

### Fraction normalization
- values such as `043/198` and `4/102` are captured as fraction tokens
- printed-number side is also extracted into collector expectations

### Promo normalization
- compact promo forms are recognized deterministically when safe
  - `swsh020`
  - `svp123`
  - `svp 123 -> svp123`
- this phase only extracts them centrally; it does not add new ranking rules

### Variant token normalization
- centralized stable variant tokens now include safe forms already implied by current product language:
  - `holo`
  - `reverse`
  - `full art`
  - `alt art`
  - `gold`
  - `rainbow`
  - `promo`
- normalized surface forms include:
  - `reverse holo`, `rev holo` -> `reverse`
  - `fullart` -> `full art`
  - `alternate art` -> `alt art`
- direct ranked cue mapping remains conservative:
  - only existing scored cue families are passed through to ranking
  - `reverse` is normalized and logged, but not added as a new scored cue in this phase

### Set token normalization
- light deterministic set normalization only
- existing structured alias logic is centralized for packet generation through `STRUCTURED_CARD_SET_ALIAS_MAP`
- set-like tokens and matched set phrases are surfaced as `possibleSetTokens`
- this phase does **not** expand the alias dictionary or introduce set guessing

## 5. Resolver Integration

### How `resolveQuery.ts` now uses `normalizeQuery.ts`
- `resolveQuery.ts` now calls `normalizeQuery(rawQuery)` exactly once
- the resulting packet is passed to:
  - `resolvePublicSearchPacketWithTiming(packet)`
  - `getExploreRowsPacketWithTiming(packet, ...)`

### What was centralized
- gateway normalization is now authoritative for live web resolver traffic
- direct resolver no longer owns its own authoritative raw-query parse step
- ranked resolver no longer owns its own authoritative set/variant/collector extraction step
- `ExplorePageClient` now passes the raw query to the gateway instead of a pre-normalized query

### What was removed or demoted
- duplicated authoritative preprocessing in `resolveQuery.ts` was removed
  - previous gateway-only `normalizeSearchInput` use was replaced by the packet
- ranked resolver’s local set/variant/collector expectation builders were demoted out of authority and replaced by packet consumption

## 6. Observability Added

Resolver tracing now includes centralized normalization outputs:
- raw query
- normalized query
- normalized tokens
- extracted number tokens
- extracted fraction tokens
- extracted promo tokens
- possible set tokens
- variant tokens
- resolver path used
- candidate count
- execution time
- request count when available

This makes normalization visible at the gateway seam instead of forcing maintainers to infer preprocessing from downstream behavior.

## 7. Risks / Non-Goals

### Risks
- subtle preprocessing drift between old local helpers and packet fields
- over-normalizing unsupported formats if the packet were allowed to become a guessing layer

### Why this phase is bounded
- downstream ranking logic was not changed
- identity selection logic was not changed
- route behavior was not changed
- no schema surfaces were introduced

### Non-goals
- no scoring changes
- no alias expansion campaign
- no candidate retrieval changes
- no mobile search consolidation
- no AI

## 8. Verification

### Commands run
```powershell
cd C:\grookai_vault\apps\web
npm run typecheck
npx eslint src/lib/resolver/normalizeQuery.ts src/lib/resolver/resolveQuery.ts src/lib/publicSearchResolver.ts src/lib/explore/getExploreRows.ts src/components/explore/ExplorePageClient.tsx
```

### Outcomes
- `npm run typecheck`
  - passed
- targeted `eslint`
  - passed

### Files changed in this phase
- `apps/web/src/lib/resolver/normalizeQuery.ts`
- `apps/web/src/lib/resolver/resolveQuery.ts`
- `apps/web/src/lib/publicSearchResolver.ts`
- `apps/web/src/lib/explore/getExploreRows.ts`
- `apps/web/src/components/explore/ExplorePageClient.tsx`
- `docs/contracts/NORMALIZATION_CONTRACT_V1.md`

