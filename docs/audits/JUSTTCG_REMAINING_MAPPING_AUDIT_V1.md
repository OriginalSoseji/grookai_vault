# JUSTTCG_REMAINING_MAPPING_AUDIT_V1

Status: ACTIVE  
Type: Repo / Backlog Audit  
Scope: Verified classification of the remaining JustTCG mapping backlog after the original tcgplayerId lane.

---

## Purpose

Turn the old "8,175 remaining" backlog into concrete, proven buckets tied to:

- repo implementation truth
- live database truth
- official JustTCG capability boundaries

---

## Repo Artifacts Inspected

- `backend/pricing/promote_tcgplayer_to_justtcg_mapping_v1.mjs`
- `backend/pricing/promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs`
- `backend/pricing/justtcg_client.mjs`
- `backend/pricing/test_justtcg_post_batch_probe.mjs`
- `backend/pokemon/promote_tcgdex_tcgplayer_bridge_v1.mjs`
- `backend/pokemon/test_tcgdex_tcgplayer_bridge_dryrun.mjs`
- `docs/checkpoints/JUSTTCG_MAPPING_LANE_V1.md`
- `docs/audits/JUSTTCG_MAPPING_AUDIT.md`
- `docs/contracts/JUSTTCG_BATCH_LOOKUP_CONTRACT_V1.md`
- `supabase/migrations/20251213153625_baseline_init.sql`
- `supabase/migrations/20251213153630_baseline_constraints.sql`

---

## Current Repo Truth

### Active JustTCG lane before this pass

The original mapping lane was already verified and remains unchanged:

- source of truth for JustTCG lookup: documented `POST /cards`
- deterministic bridge input: active `tcgplayer` mapping
- deterministic match-back: returned `tcgplayerId`
- persistence target: `external_mappings(source='justtcg').external_id = JustTCG card id`
- conflict policy: skip, do not overwrite

### Schema invariants that matter

Verified in repo schema and live DB behavior:

- `external_mappings(source, external_id)` is unique
- `external_mappings.card_print_id` references `card_prints(id)`
- the DB does not enforce `(card_print_id, source)` uniqueness
- workers must therefore prevent same-source conflicts in code

---

## Backlog Snapshot

### Starting snapshot before pilot apply

Verified before the new pilot write:

- active JustTCG mappings: `14,064`
- total `card_prints`: `22,239`
- remaining without active JustTCG: `8,175`

### Post-pilot state after bounded apply

Verified after `--apply --limit=300` on the new deterministic bridge worker:

- active JustTCG mappings: `14,142`
- total `card_prints`: `22,239`
- remaining without active JustTCG: `8,097`
- coverage: `63.59%`

Pilot delta:

- new active JustTCG mappings added: `78`

---

## Remaining Bucket Classification

### Pre-pilot bucket counts

These are the backlog counts at the start of this pass:

| Bucket | Count | Why current lane missed it | Automatic write eligibility |
|---|---:|---|---:|
| No active `tcgplayer`, active `tcgdex` present | `7,906` | current worker only reads active `tcgplayer` mappings | Partially eligible through the new TCGdex pricing-productId bridge |
| Active `tcgplayer` present, but JustTCG returns duplicate rows | `37` | upstream ambiguity for a single `tcgplayerId` | No |
| Active `tcgplayer` present, but JustTCG returns no row | `1` | upstream miss | No |
| No active `tcgplayer` and no active `tcgdex` | `231` | no verified bridge exists | No |

### Post-pilot remaining counts

After the bounded apply:

| Bucket | Count |
|---|---:|
| No active `tcgplayer`, active `tcgdex` present | `7,828` |
| Active `tcgplayer` present, still unresolved | `38` |
| No active `tcgplayer` and no active `tcgdex` | `231` |

Notes:

- the `38` unresolved `tcgplayer` bucket stayed unchanged because it is still blocked by upstream duplicate/missing behavior
- the new pilot only reduced the `tcgdex-only` bucket

---

## Representative Rows By Bucket

### Bucket A: `tcgdex` present, no `tcgplayer`, no `justtcg`

Representative remaining rows after pilot:

- `2918cc36-7194-4c96-9935-7d7be2fe36e2` | `Bulbasaur` | `A1` | `Genetic Apex` | `001` | `tcgdex=A1-001`
- `61987d51-0326-4ba2-bf82-3ae2dc48c984` | `Venusaur ex` | `A1` | `Genetic Apex` | `004` | `tcgdex=A1-004`
- `36d172c5-7c29-4ba3-8822-1a04dd46cb51` | `Weedle` | `A1` | `Genetic Apex` | `008` | `tcgdex=A1-008`

Why the old lane missed them:

- no active `tcgplayer` bridge row existed
- the original JustTCG worker is intentionally tcgplayerId-only

What the new worker proved:

- some rows in this bucket do carry a deterministic TCGplayer productId inside the full TCGdex payload
- those rows can be safely promoted through JustTCG's documented `tcgplayerId` lane
- many rows in this bucket still have no `pricing.tcgplayer.*.productId` and remain blocked

### Bucket B: active `tcgplayer` present, upstream duplicate JustTCG result

Representative unresolved rows:

- `16cae8a3-2d4e-4bd8-8ce7-df2c51d4a570` | `Mew` | `ex13` | `Holon Phantoms` | `111` | `tcgplayer=87400`
- `3fa73aaf-c6b7-40bc-bd32-689bbf304cd4` | `Venusaur & Snivy-GX` | `sm12` | `Cosmic Eclipse` | `249` | `tcgplayer=201609`
- `05aee438-0f6c-464d-a1ba-fc65a8709a18` | `Volcarona-GX` | `sm12` | `Cosmic Eclipse` | `252` | `tcgplayer=201641`

Why the lane missed them:

- JustTCG returned duplicate card rows for the same `tcgplayerId`
- the contract correctly treats that as ambiguity and refuses automatic writes

### Bucket C: active `tcgplayer` present, upstream missing

Verified unresolved row:

- `06263541-5358-4bb4-98e4-e7f18558f87b` | `Metal Energy` | `tk-xy-b` | `XY trainer Kit (Bisharp)` | `2` | `tcgplayer=98148`

Why the lane missed it:

- JustTCG returned no matching card for the bridged `tcgplayerId`

### Bucket D: no `tcgplayer`, no `tcgdex`, no `justtcg`

Representative rows:

- `4e714b58-bcf3-4931-9c46-163dadba49b8` | `Electabuzz` | `bp` | `Best of Game` | `1`
- `8dae8f1d-437f-464c-8415-50f763d1801d` | `Rocket's Scizor` | `bp` | `Best of Game` | `4`
- `371e2c1c-4a18-4961-b2a3-8d01edc07e90` | `Rocket's Mewtwo` | `bp` | `Best of Game` | `8`

Why the lane missed them:

- there is no active bridge input at all
- no deterministic automatic path exists in this pass

---

## Backlog Shape Notes

Additional evidence from the starting snapshot:

- promo-like rows in the starting remainder: `1,271`
- trainer-gallery-like rows in the starting remainder: `190`
- odd numbering family rows in the starting remainder: `1,456`

Interpretation:

- the backlog is not random
- it is concentrated in special-set, promo, trainer-kit, and non-standard numbering families
- a meaningful share of the remainder either lacks a bridge or belongs to coverage families where TCGplayer-style identity is thinner

---

## New Deterministic Bridge Proven In This Pass

### Bridge rule

For a row with:

- active `tcgdex`
- no active `tcgplayer`
- no active `justtcg`

Grookai now safely does:

1. fetch full TCGdex card payload by `tcgdex` external ID
2. inspect populated `pricing.tcgplayer.*.productId` fields
3. require exactly one distinct productId across populated buckets
4. call JustTCG `POST /cards` with that `tcgplayerId`
5. persist only if JustTCG returns exactly one conflict-free card

### Dry-run proof

Stable dry-run after ordering hardening:

- command: `node backend\pricing\promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs --dry-run --limit=300`
- inspected: `300`
- batch_ready: `84`
- no_bridge: `216`
- conflicting_existing: `6`
- ambiguous: `0`
- no_match: `0`
- would_upsert: `78`
- errors: `0`

### Apply proof

Bounded pilot apply:

- command: `node backend\pricing\promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs --apply --limit=300`
- upserted: `78`
- ambiguous: `0`
- no_match: `0`
- conflicting_existing: `6`
- errors: `0`

### Example promoted rows

Representative newly attached rows:

- `Dratini` | `me02.5` | `Ascended Heroes` | `150`
- `Iono's Bellibolt ex` | `me02.5` | `Ascended Heroes` | `279`
- `Mega Gengar ex` | `me02.5` | `Ascended Heroes` | `269`

All were persisted with:

- `source='justtcg'`
- deterministic JustTCG card ID
- `meta.promoted_by='promote_tcgdex_bridge_to_justtcg_mapping_v1'`
- `meta.resolved_via='tcgdex_pricing_productId_then_tcgplayerId'`

---

## Audit Conclusion

The remaining JustTCG backlog is no longer vague.

Verified reality:

- the old `tcgplayer` lane is exhausted for safe automatic writes
- the dominant remaining bucket was `tcgdex-only`, not `tcgplayer-present`
- a deterministic new bridge exists for the subset of `tcgdex-only` rows whose full TCGdex payload exposes exactly one TCGplayer productId
- this pass safely converted `78` rows with zero integrity violations
- the majority of the remaining backlog is still bridge-limited, not worker-limited

The unresolved remainder now cleanly splits into:

- rows with no deterministic TCGplayer bridge
- rows blocked by upstream duplicate JustTCG results
- rows with no usable upstream JustTCG result
- rows with no verified bridge at all
