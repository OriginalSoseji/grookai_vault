# Source Route Equivalence Evidence - 2026-05-17

Status: no-write evidence only. This report authorizes no Supabase writes, migrations, inserts, updates, deletes, route writes, set creation, card backfill, mapping movement, metadata merge, or production data mutation.

## Purpose

Prove whether the two missing-card groups that looked like source-route problems already have complete DB ownership: Shiny Vault in `sma` and Rumble in `ru1`.

## Source Evidence

- `docs/audits/pokemon_master_set_audit_v1/summary.json`
- `docs/plans/pokemon_db_remediation_v1/missing_set_universe_decision_20260517.md`
- `docs/plans/pokemon_db_remediation_v1/missing_cards_backfill_evidence_matrix_20260517.json`
- `live_read_only_supabase_evidence_2026-05-17`
- live read-only Supabase query inside `begin transaction read only`

## Summary

| Source route candidate | Existing DB target | Source cards | DB cards | Matched identities | Missing in DB | Extra in DB | Status |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Shiny Vault | `sma` / Hidden Fates Shiny Vault | 94 | 94 | 94 | 0 | 0 | PASS_EXACT_EQUIVALENCE |
| Rumble | `ru1` / Pokémon Rumble | 16 | 16 | 16 | 0 | 0 | PASS_EXACT_EQUIVALENCE |

Result: both candidates are exact number/name checklist matches. Recommended immediate card inserts remain `0`, and recommended immediate set creates remain `0`.

## Candidate Details

### Shiny Vault -> `sma`

- PkmnCards source: https://pkmncards.com/collection/shiny-vault/
- Existing DB target: `sma` / Hidden Fates Shiny Vault
- Source card count: 94
- DB card count: 94
- Source number range: SV1-SV94
- DB number range: SV1-SV94
- Missing in DB: 0
- Extra in DB: 0
- Recommended next action: source collection route to existing sma; no card insert and no new set

| Candidate route code/slug | Classification row exists | Current classification |
| --- | --- | --- |
| `shiny-vault` | yes | alias -> sma |

| Active external mapping source | Rows | Distinct card prints |
| --- | ---: | ---: |
| tcgdex | 94 | 94 |

### Rumble -> `ru1`

- PkmnCards source: https://pkmncards.com/set/rumble/
- Existing DB target: `ru1` / Pokémon Rumble
- Source card count: 16
- DB card count: 16
- Source number range: 1-16
- DB number range: 1-16
- Missing in DB: 0
- Extra in DB: 0
- Recommended next action: set/source alias route from RM to existing ru1; no card insert and no new set

| Candidate route code/slug | Classification row exists | Current classification |
| --- | --- | --- |
| `rm` | yes | alias -> ru1 |

| Active external mapping source | Rows | Distinct card prints |
| --- | ---: | ---: |
| tcgdex | 16 | 16 |

## Conclusions

- `Shiny Vault` is a 94/94 exact match to existing `sma` / `Hidden Fates Shiny Vault`.
- `Rumble` is a 16/16 exact match to existing `ru1` / `Pokemon Rumble`.
- The prior apparent missing-card count drops by 110 for these two groups once source-route equivalence is honored.
- Future work should plan source-route or alias classification only. It should not create new sets or insert these 110 card rows.

## Future Write Boundaries

A future write plan, if authorized, must stay limited to route/source classification. It must not move cards, delete alias rows, create set rows, merge metadata, move external mappings, backfill cards, or create variants.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No route writes.
- No card backfills.
- No data changes.
