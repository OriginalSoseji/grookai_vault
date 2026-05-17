# Pokemon DB Remediation V1 Execution Queue - 2026-05-17

Status: no-write queue only. This document authorizes no Supabase writes, migrations, inserts, updates, deletes, route writes, card backfills, variant writes, or production data mutation.

## Queue Rules

- Every queue item starts as read-only evidence or dry-run planning.
- No item can move to write execution without explicit approval, fresh preflight, a narrow transaction scope, rollback notes, and post-write verification.
- Hard-stop and review-stop groups stay excluded from broad execution scopes.
- Missing-card work cannot start before canonical target set and printed number identity are proven.
- Variant work cannot start before `VARIANT_AUTHORITY_MODEL_V2` is approved.

## Lane 1: Safe Route / Classification Follow-Ups

Current route/classification state:

- `sv3pt5 -> sv03.5` executed and verified.
- `sm35 -> sm3.5` executed and verified.
- `Shiny Vault -> sma` source-route equivalence proved 94/94 in `source_route_equivalence_evidence_20260517.md`; no card inserts or set creates.
- `Rumble -> ru1` source-route equivalence proved 16/16 in `source_route_equivalence_evidence_20260517.md`; no card inserts or set creates.
- `source_route_classification_execution_20260517.md` records the executed DB source-route inserts for `shiny-vault -> sma` and `rm -> ru1`.
- `public_route_search_resolver_impact_review_20260517.md` proves the public app does not currently consume `set_code_classification`; route/search completion needs app-side alias resolver coverage or an explicit DB-only acceptance.
- `public_route_search_resolver_patch_20260517.md` adds app-side route/search alias coverage for `shiny-vault -> sma`, `rm -> ru1`, and the already executed safe route aliases `sv3pt5 -> sv03.5`, `sm35 -> sm3.5`.
- The 20 alias-candidate route review queue is now clean.
- Recommended immediate route writes: `0`.

Future no-write queue:

| Priority | Item | Scope | Required evidence | Write status |
| ---: | --- | --- | --- | --- |
| 1 | Public app route regression audit | approved safe aliases only | verify route/search behavior against running app if local TLS allows DB-backed smoke | no DB write |
| 2 | Alias route regression audit | all executed route aliases | confirm route classifications still point to canonical targets after future changes | read-only verification |
| 3 | Alias metadata source-payload diff | 20 route-clean alias candidates | field-level diff for `source`, release dates, logos, symbols, printed totals | no metadata write |
| 4 | Route regression audit | all known aliases | confirm classifications still route to canonical targets after future changes | read-only verification |

No alias row deletion should appear in this lane.

## Lane 2: Number Normalization Dry-Run Candidates

Current evidence:

| Lane | Rows | Next gate |
| --- | ---: | --- |
| Numeric source candidates outside hard stops | 504 | row-level candidate evidence complete |
| Clean numeric Lane A write-plan candidates | 248 | no-write future write-plan draft only |
| Collision-blocked numeric Lane A rows | 256 | collision ownership investigation |
| Prefixed source candidates outside hard stops | 114 | prefix policy review |
| Complex source candidates outside hard stops | 5 | manual suffix policy review |
| Hard-stop set rows | 374 | canonicalization hard-stop resolution |
| Existing number/generated field risk rows | 1,554 | comparable number contract |
| Source-tail conflicts on existing numbers | 85 | source conflict manual review |

Recommended immediate number writes remain `0`.

Future no-write queue:

| Priority | Item | Scope | Required evidence | Write status |
| ---: | --- | --- | --- | --- |
| 1 | Clean Lane A write-plan draft | 248 rows | guard clauses, rollback, post-write checks, still no execution | no-write SQL plan only |
| 2 | Collision ownership investigation | 256 rows | prove whether collisions are duplicate imports, alternate identities, or source mapping drift | evidence only |
| 3 | Prefix policy | 114 prefixed candidates | define whether prefixes stay in `number` and how `number_plain` compares | policy only |
| 4 | Complex suffix review | 5 candidates | manual decision for `65A`, `15A1`, `15A2`, `15A3`, `15A4` semantics | policy only |
| 5 | Comparable number contract | 1,554 mismatch rows | define generated/comparable fields without overwriting printed identity | contract only |
| 6 | Source-tail conflict review | 85 rows | reconcile source external id tails against printed number | evidence only |

## Lane 3: Missing Card Backfill Candidates

Current evidence:

| Lane | Groups | Missing cards | Secret-range cards |
| --- | ---: | ---: | ---: |
| Source route or existing target, no insert | 2 | 110 | 0 |
| Target set needed before card backfill | 4 | 117 | 0 |
| Special policy blocked | 12 | 106 | 8 |
| Number normalization first | 6 | 54 | 5 |
| Name mismatch or identity review first | 9 | 90 | 0 |
| Secret-range high risk | 1 | 39 | 16 |
| Secret-range review first | 1 | 25 | 1 |
| Canonical alias blocked | 1 | 10 | 0 |
| Established-set backfill candidate after preflight | 16 | 66 | 0 |

Recommended immediate card inserts remain `0`.

Established-set candidate dry-run lane:

| Set | DB code(s) | Missing cards | Secret-range cards |
| --- | --- | ---: | ---: |
| Burning Shadows | `sm3` | 23 | 0 |
| Crimson Invasion | `sm4` | 8 | 0 |
| Sun & Moon | `sm1` | 7 | 0 |
| Shining Legends | `sm3.5`, `sm35` | 5 | 0 |
| Fates Collide | `xy10` | 3 | 0 |
| Platinum | `pl1` | 3 | 0 |
| Stormfront | `dp7` | 3 | 0 |
| Sun & Moon Promos | `smp` | 3 | 0 |
| Unified Minds | `sm11` | 3 | 0 |
| Supreme Victors | `pl3` | 2 | 0 |
| Ancient Origins | `xy7` | 1 | 0 |
| BREAKpoint | `xy9` | 1 | 0 |
| BREAKthrough | `xy8` | 1 | 0 |
| Cosmic Eclipse | `sm12` | 1 | 0 |
| Flashfire | `xy2` | 1 | 0 |
| Generations | `g1` | 1 | 0 |

Future no-write queue:

| Priority | Item | Scope | Required evidence | Write status |
| ---: | --- | --- | --- | --- |
| 1 | Source-route verification | Shiny Vault, Rumble | keep evidence proving existing target equivalence after route classification execution | no insert |
| 2 | Target-set dry-run | TCG Classic decks, McDonald's Match Battle 2023 | prove target set rows before card candidates | no set write |
| 3 | Number-first gap review | 6 groups / 54 cards | complete number normalization or intentional deferral | no insert |
| 4 | Established-set card candidate pack | 16 groups / 66 cards | one-row-per-card identity proof, no conflicts, no variants | no-write candidate matrix |
| 5 | Secret-range evidence packs | Mega Evolution Promos, Guardians Rising, Scarlet & Violet scoped groups | prove printed identity and set ownership card by card | no insert |

## Lane 4: Variant Work

Current evidence:

| Source | Variant slots/signals |
| --- | ---: |
| DB variant slots | 2,901 |
| TCGdex signals | 21,066 |
| PokemonTCG/TCGPlayer signals | 32,449 |

Recommended immediate variant writes remain `0`.

Future no-write queue:

| Priority | Item | Scope | Required evidence | Write status |
| ---: | --- | --- | --- | --- |
| 1 | Freeze variant writes | all Pokemon DB remediation | confirm missing-card backfill excludes variants | policy gate |
| 2 | Source vocabulary inventory | TCGdex, PokemonTCG/TCGPlayer, JustTCG, DB JSON | classify raw terms | read-only evidence |
| 3 | Authority contract | `VARIANT_AUTHORITY_MODEL_V2` | approval of identity, finish, stamp, market-only, product-only lanes | contract only |
| 4 | Variant evidence matrix by set | post-canonicalization scope | compare source signals against canonical card identity | no-write matrix |
| 5 | Future dry-run plan | approved contract only | candidate rows, conflict lanes, rollback, post-write checks | no execution |

## Lane 5: Hard-Stop Investigations

Hard stops must be investigated one group at a time. They are not eligible for broad cleanup.

| Priority | Group | Codes | Investigation goal |
| ---: | --- | --- | --- |
| 1 | Prismatic Evolutions | `sv08.5` / `sv8pt5` | explain zero-overlap unique identity ownership before any route, merge, number, or card work |
| 2 | Paldean Fates | `sv04.5` / `sv4pt5` | prove whether unique identities are true source splits or duplicate import drift |
| 3 | Shrouded Fable | `sv06.5` / `sv6pt5` | resolve overlap plus unique ownership on both sides |
| 4 | Pokemon GO | `pgo` / `swsh10.5` | reconcile JustTCG/TCGPlayer ownership against TCGdex ownership |

Review-stop investigations:

| Priority | Group | Codes | Investigation goal |
| ---: | --- | --- | --- |
| 1 | Best of Game | `bog` / `bp` | decide source authority for duplicate overlapping cards |
| 2 | EX Trainer Kit 2 Minun | `tk-ex-m` / `tk2b` | choose canonical ownership and merge policy |
| 3 | EX Trainer Kit 2 Plusle | `tk-ex-p` / `tk2a` | choose canonical ownership and merge policy |
| 4 | EX Trainer Kit Latias | `tk-ex-latia` / `tk1a` | choose canonical ownership and merge policy |
| 5 | EX Trainer Kit Latios | `tk-ex-latio` / `tk1b` | choose canonical ownership and merge policy |

## Release Gate

Before any future write execution:

1. Confirm branch and HEAD.
2. Confirm migration ledger alignment.
3. Run `npm run preflight`.
4. Regenerate the relevant read-only evidence matrix.
5. Verify no hard-stop or review-stop pair is in write scope.
6. Execute only a guarded transaction reviewed for that exact scope.
7. Commit a post-write execution checkpoint with verification evidence.

Until those gates pass and explicit authorization is given, this queue stops at planning.
