# Set Alias Route Classification Execution - 2026-05-17

Status: executed DB route-classification change for exactly two aliases. This checkpoint records the approved first DB write from Pokemon DB Remediation V1.

## Scope

Executed route-classification changes only:

| Alias | Canonical target | Operation |
| --- | --- | --- |
| `sv3pt5` | `sv03.5` | updated existing `set_code_classification` row |
| `sm35` | `sm3.5` | inserted new `set_code_classification` row |

No other alias candidates were in scope.

## Source Plan

- `docs/plans/pokemon_db_remediation_v1/set_alias_route_classification_write_plan_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_route_classification_write_plan_20260517.sql`
- `docs/plans/pokemon_db_remediation_v1/set_alias_prewrite_evidence_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/set_alias_prewrite_evidence_matrix_20260517.json`

## Fresh Preflight

Executed immediately before the write:

| Gate | Result |
| --- | --- |
| Branch | `scanner-v4-card-present-gate` |
| HEAD | `f5c1f64` |
| `npm run preflight` | `PASS_WITH_DEFERRED_DEBT`, 0 critical failures |
| `supabase migration list --linked` | local and remote aligned |
| `node scripts/audits/set_alias_prewrite_evidence_v1.mjs` | passed and regenerated evidence |
| Alias rows own zero cards | passed |
| Alias rows have no hidden non-card FK dependencies | passed |
| Canonical rows own real cards | passed |
| Hard/review stop scope excluded | passed |

## Transaction Summary

The write was executed in a guarded transaction with verification before commit.

`sv3pt5` before:

```text
set_code = sv3pt5
is_canon = true
canonical_set_code = sv3pt5
canon_source = pokemonapi
notes = Canonical SV pt5 expansion; promoted after identity audit
```

`sv3pt5` after:

```text
set_code = sv3pt5
is_canon = false
canonical_set_code = sv03.5
canon_source = alias
notes += 2026-05-17 route-classification execution: sv3pt5 is a permanent alias of sv03.5; no set/card/metadata/mapping movement.
```

`sm35` before:

```text
classification row absent
```

`sm35` after:

```text
set_code = sm35
is_canon = false
canonical_set_code = sm3.5
canon_source = alias
notes = 2026-05-17 route-classification execution: sm35 is a permanent alias of sm3.5; no set/card/metadata/mapping movement.
```

## Post-Write Verification

Independent read-only verification after commit passed.

| Check | Result |
| --- | --- |
| `sv3pt5` routes to `sv03.5` | passed |
| `sm35` routes to `sm3.5` | passed |
| `sv3pt5` alias card count | 0 |
| `sm35` alias card count | 0 |
| `sv03.5` canonical card count | 210 |
| `sm3.5` canonical card count | 78 |
| Alias external mappings | 0 |
| Alias external printing mappings | 0 |
| Alias JustTCG set mappings | 0 |

The regenerated alias evidence now reports:

| Evidence | Result |
| --- | --- |
| Alias pairs audited | 20 |
| Blockers | 0 |
| Route classification review queue | 0 |
| Missing alias classification rows | 0 |
| Mismatched alias classification rows | 0 |

The 20 alias candidates remain `PASS_WITH_REVIEW` because metadata/source-field review is still separate and unresolved. The route layer itself is clean for the 20-candidate set.

## Boundary Confirmation

- No migrations.
- No card movement.
- No set rows deleted.
- No alias rows deleted.
- No metadata merge.
- No external mappings changed.
- No external printing mappings changed.
- No JustTCG mappings changed.
- No missing-card backfill.
- No variant changes.

## Remaining Work

- Review metadata/source preservation behavior for the 20 alias candidates.
- Keep hard stops and review stops excluded from this completed route fix.
- Do not proceed to missing-card backfill until set canonicalization, missing-set policy, and number normalization are stable.
