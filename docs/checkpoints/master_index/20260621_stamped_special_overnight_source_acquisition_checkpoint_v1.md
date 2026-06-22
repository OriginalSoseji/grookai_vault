# Stamped/Special Overnight Source Acquisition Checkpoint V1

Date: 2026-06-21

## Scope

Audit-only stamped/special residual source acquisition.

No DB writes. No migrations. No apply. No deletes. No cleanup. No quarantine.

## Starting Baseline

- residual rows: 280
- write_ready_now: 0
- dependency blocked: 15
- evidence blocked: 171
- manual adjudication: 3
- no-write governance: 91
- next-action queue fingerprint: `9611b9ac7ef270b8c87d91bf83640c6f7710de9adb2bd8e0a120e6191034cb3c`

## Source Lanes Run

- Prize Pack current queue acquisition and closure
- League finish acquisition and preserved crosscheck
- Small custom stamp preserved crosscheck and readiness
- Prerelease / Professor Program current Pokumon acquisition
- TCGCSV stamped subtype acquisition, patched to consume the live residual queue
- CardTrader stamped finish acquisition, patched to consume the live residual queue
- PokeCardValues stamped finish acquisition, patched to consume the live residual queue
- pkmn.gg stamped finish acquisition, newly added as an audit-only exact subtype source
- Final source-delta summary and stamped/special rollups

## New Evidence Preserved

### PokeCardValues

Accepted 2 exact finish evidence records:

- `bwp` Champions Festival `BW95`, Quarter-Finalist Worlds Promo, `normal`
- `dp6` Dragonite `2`, Staff National Championships, `normal`

These were preserved under:

- `docs/audits/verified_master_set_index_v1/source_fixtures/generated_pokecardvalues_stamped_finish_v1/`

### pkmn.gg

Added a new exact subtype acquisition adapter:

- `scripts/audits/english_master_index_pkmngg_stamped_finish_acquisition_v1.mjs`

Accepted 37 exact pkmn.gg stamped/variant finish records:

- reverse: 30
- normal: 4
- holo: 3

Fixture output:

- `docs/audits/verified_master_set_index_v1/source_fixtures/generated_pkmngg_stamped_finish_v1/`

Source-delta result:

- candidate_records_loaded: 37
- useful_candidate_matches: 0
- already_in_current_index: 36
- unmatched_candidate_records: 1

Meaning: the pkmn.gg lane materially improves preserved source evidence, but it does not create new current-gap write readiness yet.

## Ending State

- residual rows: 280
- write_ready_now: 0
- dependency blocked: 15
- evidence blocked: 171
- manual adjudication: 3
- no-write governance: 91
- final exhaustion fingerprint: `2ddd64fa4ef19785c9f2b3de7420d80d91a951a3df89f3b97dd99554df742d54`
- blocker handoff remains no-write

## Key Findings

- Prize Pack remains blocked by exact finish mapping/source disagreement.
- League remains blocked where exact active finish is not source-bound.
- Small custom stamp remains mostly fresh-source blocked.
- Prerelease and Professor Program rows did not produce promotable exact finish evidence.
- TCGCSV and CardTrader produced no exact current residual matches.
- PokeCardValues produced 2 exact records, but they did not unlock current residual write readiness.
- pkmn.gg is useful as a preserved subtype source but mostly overlaps existing Master Index evidence.
- The PokeCardValues acquisition writer was fixed to merge fixtures additively. It must not remove preserved fixture files on future reruns.

## Guardrails Preserved

- No generic stamped row was promoted.
- No single-source claim became master truth.
- No finish was inferred from variant existence alone.
- No real apply was run.
- No migration was created.
- No cleanup/delete path was executed.

## Next Pickup

The next productive path is not another blind global rerun. Use one of these:

1. Target the 19 event/staff rows with exact collector scan/source pages.
2. Resolve Prize Pack finish mapping with a source that explicitly distinguishes Standard Set / Foil / active finish.
3. Treat Battle Academy rows as display metadata unless a future governance contract explicitly models deck marks as parent identity.
4. Build a manual review packet for the one pkmn.gg unmatched record and the 4 PokeCardValues blocked multi-variant records.

Do not run real apply without a fresh rollback-only dry-run proof and explicit approval.
