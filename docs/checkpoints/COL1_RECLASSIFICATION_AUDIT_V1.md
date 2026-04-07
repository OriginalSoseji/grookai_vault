# COL1_RECLASSIFICATION_AUDIT_V1

## Context

`col1` required a dedicated contract before reclassification because Call of Legends is a mixed-numbering family. Under `COL1_IDENTITY_CONTRACT_V1`, the exact printed token is canonical and the system must preserve both numeric tokens and shiny-legend `SL#` tokens as separate public identities.

## Why The Old Blocked Classification Is Stale

Before the contract, `col1` looked like an unsupported prefix family because numeric and `SL#` numbering coexisted in one set. After the contract:

- exact token matching is lawful
- `GV-PK-COL-<PRINTED_NUMBER>` is deterministic
- `SL#` tokens are preserved rather than collapsed into numeric tokens
- the unresolved subset can be audited directly instead of being treated as a generic blocker

## Unresolved Counts

Live unresolved `col1` surface:

- `total_unresolved = 11`
- `numeric_token_count = 5`
- `sl_token_count = 6`
- `invalid_token_count = 0`

All unresolved rows carry valid contract tokens.

## Canonical Col1 Summary

Canonical lane:

- `card_prints.set_code = 'col1'`
- `canonical_total = 95`
- `canonical_numeric_count = 90`
- `canonical_sl_count = 5`

This proves canonical `col1` already contains both numeric and `SL#` lanes, but only partially.

Representative canonical `SL#` rows already present:

- `SL1 / Deoxys / GV-PK-CL-SL1`
- `SL5 / Ho-Oh / GV-PK-CL-SL5`
- `SL6 / Kyogre / GV-PK-CL-SL6`
- `SL8 / Palkia / GV-PK-CL-SL8`
- `SL10 / Rayquaza / GV-PK-CL-SL10`

## Collapse-Safe Results

Exact collapse matching used:

- exact printed token match
- repo/canon-aware normalized name

Results:

- `collapse_candidate_count = 0`
- `multiple_match_old_count = 0`
- `reused_new_count = 0`
- `unmatched_count = 11`
- `same_token_same_name_count = 0`
- `same_token_different_name_count = 0`

No unresolved `col1` row is collapse-safe because none of the unresolved numeric tokens or `SL#` tokens already exist canonically with the same exact printed token.

## Promotion-Safe Results

Promotion results:

- `promotion_candidate_count = 11`
- `promotion_live_collision_count = 0`
- `promotion_conflict_count = 0`

All `11` unresolved rows are promotion-safe under the exact-token contract.

Promotion-safe numeric rows:

- `Clefable / 1 -> GV-PK-COL-1`
- `Forretress / 5 -> GV-PK-COL-5`
- `Groudon / 6 -> GV-PK-COL-6`
- `Hitmontop / 8 -> GV-PK-COL-8`
- `Houndoom / 10 -> GV-PK-COL-10`

Promotion-safe `SL#` rows:

- `Dialga / SL2 -> GV-PK-COL-SL2`
- `Entei / SL3 -> GV-PK-COL-SL3`
- `Groudon / SL4 -> GV-PK-COL-SL4`
- `Lugia / SL7 -> GV-PK-COL-SL7`
- `Raikou / SL9 -> GV-PK-COL-SL9`
- `Suicune / SL11 -> GV-PK-COL-SL11`

## Blocked And Qualifier Results

Results:

- `BLOCKED_CONFLICT = 0`
- `QUALIFIER_REVIEW = 0`

No unresolved row is blocked by exact-token canonical conflict, ambiguity, or qualifier evidence.

## Namespace Audit

The unresolved rows are promotion-safe, but the existing canonical `col1` lane is still on legacy namespace.

Results:

- `canonical_namespace_match_count = 0`
- `namespace_conflict_count = 95`

Canonical rows currently use legacy `GV-PK-CL-*`, while the new contract derives `GV-PK-COL-*`.

## FK Readiness

Promotion-safe subset FK inventory:

- `card_print_identity = 11`
- `card_print_traits = 11`
- `card_printings = 33`
- `external_mappings = 11`
- `vault_items = 0`

## Final Classification

Aggregate row classification:

- `COLLAPSE_SAFE = 0`
- `PROMOTION_SAFE = 11`
- `BLOCKED_CONFLICT = 0`
- `QUALIFIER_REVIEW = 0`

Under `COL1_IDENTITY_CONTRACT_V1`, the unresolved `col1` surface is a pure promotion-safe subset.

## Exact Recommended Next Phase

`COL1_NAMESPACE_MIGRATION_CONTRACT_V1`

Reason:

- unresolved `col1` rows are promotion-safe now
- but canonical `col1` still uses legacy `GV-PK-CL-*`
- promoting unresolved rows immediately would create mixed `CL` and `COL` public namespaces in one set

After canonical namespace migration, the lawful apply phase is `COL1_EXACT_TOKEN_PROMOTION_V1`.

## Status

AUDIT COMPLETE
