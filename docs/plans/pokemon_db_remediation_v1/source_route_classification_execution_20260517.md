# Source Route Classification Execution - 2026-05-17

Status: executed DB route-classification change for exactly two source routes. This checkpoint records the approved source-route write from Pokemon DB Remediation V1.

## Scope

Executed source-route classification inserts only:

| Source route | Canonical target | Operation |
| --- | --- | --- |
| `shiny-vault` | `sma` | inserted new `set_code_classification` row |
| `rm` | `ru1` | inserted new `set_code_classification` row |

No other route, alias, set, card, metadata, mapping, pricing, vault, scanner, missing-card, or variant work was in scope.

## Source Plan

- `docs/plans/pokemon_db_remediation_v1/source_route_equivalence_evidence_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/source_route_equivalence_evidence_matrix_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/source_route_classification_write_plan_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/source_route_classification_write_plan_20260517.sql`
- `docs/plans/pokemon_db_remediation_v1/source_route_classification_write_plan_matrix_20260517.json`
- `docs/plans/pokemon_db_remediation_v1/public_route_search_resolver_impact_review_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/public_route_search_resolver_patch_20260517.md`

## Fresh Preflight

Executed immediately before the write:

| Gate | Result |
| --- | --- |
| Branch | `scanner-v4-card-present-gate` |
| HEAD | `01c69f8` |
| Dirty files before write | `.flutter-plugins-dependencies`, `docs/audits/pokemon_master_set_audit_v1/`, `scripts/audits/pokemon_master_set_audit_v1.mjs` |
| `supabase migration list --linked` | local and remote aligned |
| `npm run preflight` | `PASS_WITH_DEFERRED_DEBT`, 0 critical failures |
| `node scripts/audits/source_route_equivalence_evidence_v1.mjs` | 2 exact passes, 110 matched identities, 0 missing, 0 extra |
| Alias classification rows absent | passed for `shiny-vault`, `rm` |
| Target canonical sets exist | passed for `sma`, `ru1` |
| Target canonical card counts | `sma=94`, `ru1=16` |
| Alias set rows absent | passed |
| Alias card rows absent | passed |
| Hard-stop aliases excluded | passed |

## Transaction Summary

The write was executed in a guarded transaction with verification before commit.

`shiny-vault` before:

```text
classification row absent
```

`shiny-vault` after:

```text
set_code = shiny-vault
is_canon = false
canonical_set_code = sma
canon_source = source_route
notes = 2026-05-17 source-route execution: PkmnCards Shiny Vault is a 94/94 exact checklist match to canonical sma; no set/card/metadata/mapping movement.
```

`rm` before:

```text
classification row absent
```

`rm` after:

```text
set_code = rm
is_canon = false
canonical_set_code = ru1
canon_source = source_route
notes = 2026-05-17 source-route execution: PkmnCards Rumble/RM is a 16/16 exact checklist match to canonical ru1; no set/card/metadata/mapping movement.
```

## Post-Write Verification

Independent read-only verification after commit passed.

| Check | Result |
| --- | --- |
| `shiny-vault` routes to `sma` | passed |
| `rm` routes to `ru1` | passed |
| `sma` canonical card count | 94 |
| `ru1` canonical card count | 16 |
| `shiny-vault` direct card rows | 0 |
| `rm` direct card rows | 0 |
| `shiny-vault` set rows | 0 |
| `rm` set rows | 0 |
| canonical external mapping snapshot | `sma=94 tcgdex`, `ru1=16 tcgdex` |

The regenerated source-route equivalence evidence reports:

| Evidence | Result |
| --- | --- |
| Candidates audited | 2 |
| Exact equivalence passes | 2 |
| Source cards audited | 110 |
| DB cards audited | 110 |
| Matched identity count | 110 |
| Missing in DB | 0 |
| Extra in DB | 0 |
| Recommended card inserts | 0 |
| Recommended set creates | 0 |
| Recommended immediate writes | 0 |

## Boundary Confirmation

- No migrations.
- No card movement.
- No card inserts.
- No set creation.
- No set deletion.
- No metadata merge.
- No external mappings changed.
- No external printing mappings changed.
- No hard-stop aliases touched.
- No missing-card backfill.
- No variant changes.

## Remaining Work

- Keep source-route DB rows as routing/audit metadata only.
- Do not import Shiny Vault or Rumble cards; both are exact matches to existing canonical sets.
- Continue missing-card remediation only through the established evidence-gated queue.
- Keep hard-stop and review-stop groups excluded from broad execution scopes.
