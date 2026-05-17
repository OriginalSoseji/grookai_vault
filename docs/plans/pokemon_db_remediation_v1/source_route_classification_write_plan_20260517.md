# Source Route Classification Write Plan - 2026-05-17

Status: no-write write-plan design only. This plan authorizes no Supabase writes, migrations, inserts, updates, deletes, route writes, set creation, card backfill, metadata merge, external mapping movement, variant writes, or production data mutation.

## Purpose

Design the future route/source classification write plan for the two source-route equivalences already proven:

| Source route code | Canonical DB set | Evidence |
| --- | --- | --- |
| `shiny-vault` | `sma` | PkmnCards Shiny Vault is a 94/94 exact number/name checklist match to `sma`. |
| `rm` | `ru1` | PkmnCards Rumble is a 16/16 exact number/name checklist match to `ru1`. |

This is not a card backfill plan. The purpose is to preserve source/search routing so these source pages stop appearing as missing-card/set work.

## Source Evidence

- `source_route_equivalence_evidence_20260517.md`
- `source_route_equivalence_evidence_matrix_20260517.json`
- `missing_set_universe_decision_20260517.md`
- `missing_cards_backfill_evidence_20260517.md`
- live read-only Supabase preflight on 2026-05-17
- repo route/search review of `publicSearchResolver`, `publicSets`, `list_set_codes`, and `search_cards_in_set`

Fresh read-only preflight showed:

| Route code | Current classification row | Canonical row | Canonical cards | Distinct numbers |
| --- | --- | --- | ---: | ---: |
| `shiny-vault` | absent | `sma` is canonical | 94 | 94 |
| `rm` | absent | `ru1` is canonical | 16 | 16 |

## Target Changes

Future route-classification write shape only:

| Future row | is_canon | canonical_set_code | canon_source | Operation |
| --- | --- | --- | --- | --- |
| `shiny-vault` | false | `sma` | `source_route` | guarded insert |
| `rm` | false | `ru1` | `source_route` | guarded insert |

No existing card, set, metadata, mapping, pricing, vault, scanner, or variant rows should change.

## Non-Goals

- No card movement.
- No card inserts.
- No set creation.
- No set deletion.
- No metadata copy.
- No external mapping movement.
- No external printing mapping movement.
- No source payload merge.
- No variant writes.
- No pricing changes.
- No public app code changes in this plan.

## Scope Lock

Only these source route codes may appear in a future writable input:

- `shiny-vault`
- `rm`

Only these canonical targets may appear:

- `sma`
- `ru1`

Excluded from this plan:

- `sv3pt5`, `sm35`, and the 20 alias-candidate set canonicalization queue
- all hard-stop and review-stop canonicalization pairs
- all TCG Classic and McDonald's target-set dry-run work
- all number normalization work
- all missing-card backfill work
- all variant work

## Preflight Gates

Future execution must stop unless all gates pass immediately before a writable transaction:

1. Migration ledger is aligned.
2. Write scope is exactly `shiny-vault` and `rm`.
3. Target canonical rows `sma` and `ru1` exist in `public.sets`.
4. Target canonical rows still own exactly 94 and 16 card prints respectively, unless a newer approved audit updates those expected counts.
5. Source-route equivalence script still reports 2 exact passes, 110 matched identities, zero missing in DB, zero extra in DB.
6. `set_code_classification` required columns still exist.
7. `set_code_classification.set_code` is still the primary key or an equivalent unique conflict key.
8. `shiny-vault` classification row is still absent.
9. `rm` classification row is still absent.
10. No `sets` row exists for `shiny-vault` or `rm`.
11. No `card_prints` row uses `set_code` `shiny-vault` or `rm`.
12. No external mapping, printing mapping, pricing, vault, or scanner write is in scope.
13. Public route/search impact is acknowledged as partial until app resolver behavior is separately verified or updated.

## Route And Search Impact

The DB route layer can represent these source aliases through `set_code_classification`. This helps DB-side source routing, future audit interpretation, and any consumer that explicitly resolves aliases through `set_code_classification`.

Current public app behavior is only partially classification-aware:

- `publicSearchResolver` uses `SET_INTENT_ALIAS_MAP` and public set metadata, not a live `set_code_classification` lookup.
- `publicSets` builds set lists from `card_prints.set_code`, so source-only aliases with no card rows will not appear as standalone public sets.
- `search_cards_in_set` filters `v_cards_search_v2.set_code` directly, so callers must resolve `shiny-vault -> sma` or `rm -> ru1` before direct set-card lookup.
- Existing fuzzy set-name behavior likely finds `sma` for "shiny vault" because the DB set name is "Hidden Fates Shiny Vault".
- `rm` is not currently guaranteed as a public app alias because `Pokemon Rumble` has code `ru1` and printed abbrev `RU`, while `RM` comes from PkmnCards.

Conclusion: the DB write plan is deterministic, but public user-facing route/search support should be treated as a separate app resolver review unless future evidence proves the runtime already resolves these aliases.

## Future Write Shape

The companion SQL plan is:

- `source_route_classification_write_plan_20260517.sql`

The SQL file contains:

- read-only preflight gates
- commented future insert section
- transaction-first rollback shape
- post-write verification queries

The future write section is intentionally commented so it cannot run accidentally.

## Rollback Plan

Rollback should be transaction-first:

1. Start a writable transaction only after explicit approval.
2. Snapshot current classification and card-count evidence.
3. Insert the two source-route rows.
4. Run post-write verification before commit.
5. Use `rollback` instead of `commit` if any verification fails.

If a future approved transaction is committed and later needs reversal, exact row removal would require a separate rollback approval because this plan intentionally includes no `delete`. A non-destructive rollback alternative would be a separately approved classification update marking the rows as rollback-review debt while preserving audit history.

## Post-Write Verification

Future execution must verify:

- `shiny-vault` routes to `sma`.
- `rm` routes to `ru1`.
- `sma` still owns 94 card prints.
- `ru1` still owns 16 card prints.
- no `card_prints` rows use `shiny-vault` or `rm`.
- no set rows were created for `shiny-vault` or `rm`.
- no external mappings moved.
- source-route equivalence script still reports 110 matched identities and zero missing/extra rows.
- public app route/search behavior is separately verified before calling this user-facing complete.

## Recommendation

Keep this as a reviewed write plan only. The next no-write artifact should be either:

- public route/search resolver impact evidence for `shiny-vault` and `rm`, or
- explicit approval to execute only the two DB route-classification inserts after fresh preflight.

## No-Write Confirmation

- No Supabase writes.
- No migrations.
- No inserts.
- No updates.
- No deletes.
- No route writes.
- No card backfills.
- No data changes.
