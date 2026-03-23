# JUSTTCG_REMAINING_MAPPING_TCGDEX_BRIDGE_CHECKPOINT_V1

Status: ACTIVE  
Type: Checkpoint / Mapping Pattern  
Scope: Captures the reusable TCGdex-to-JustTCG bridge pattern introduced for the remaining JustTCG backlog.

---

## Purpose

Freeze the first proven alternate attachment strategy for the remaining JustTCG backlog so future work does not reopen the same bridge question.

---

## New Reusable Invariant

Grookai may use:

- `tcgdex pricing.tcgplayer.*.productId`

as a transient bridge into:

- JustTCG's documented `tcgplayerId` lookup lane

only when:

- the row has active `tcgdex`
- the row has no active `tcgplayer`
- the row has no active `justtcg`
- all populated `pricing.tcgplayer.*.productId` buckets agree on exactly one distinct value

This productId is:

- bridge input only
- not a persisted JustTCG ownership key

---

## What Was Proven

### Upstream

Official JustTCG docs already supported the card lookup side needed here:

- `POST /cards`
- `tcgplayerId`

No undocumented upstream behavior was required.

### Repo / live DB

Starting state:

- active JustTCG coverage: `14,064 / 22,239`
- remaining without JustTCG: `8,175`

Dry-run proof:

- `node backend\pricing\promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs --dry-run --limit=300`
- `would_upsert: 78`
- `ambiguous: 0`
- `no_match: 0`
- `errors: 0`

Bounded pilot apply:

- `node backend\pricing\promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs --apply --limit=300`
- `upserted: 78`
- `ambiguous: 0`
- `no_match: 0`
- `errors: 0`

Post-pilot state:

- active JustTCG coverage: `14,142 / 22,239`
- coverage: `63.59%`
- remaining without JustTCG: `8,097`

Integrity verification:

- conflicting active JustTCG external IDs: `0`
- card_prints with multiple active JustTCG mappings: `0`

---

## What This Pattern Solves

This pattern solves one real remaining bucket:

- active `tcgdex`
- no active `tcgplayer`
- no active `justtcg`
- deterministic TCGplayer productId exists inside TCGdex pricing payload

This pattern does not solve:

- rows with no bridge at all
- rows where TCGdex exposes multiple distinct productIds
- rows where JustTCG returns duplicates
- rows where JustTCG returns nothing

---

## Current Remaining Backlog After Pilot

- `38` rows still have active `tcgplayer` but remain blocked by upstream duplicate/missing behavior
- `7,828` rows remain `tcgdex-only`
- `231` rows remain without active `tcgplayer` and without active `tcgdex`

Interpretation:

- the backlog is now better understood
- it is still mostly bridge-limited
- the new worker is a safe expansion path, not a full backlog solution

---

## Hard Boundaries To Preserve

- Do not persist TCGdex pricing productIds as JustTCG ownership.
- Do not auto-write from `cardId`, `variantId`, `tcgplayerSkuId`, or set/number search.
- Do not overwrite active conflicting `justtcg` mappings.
- Do not bypass `(source, external_id)` uniqueness.
- Keep dry-run first-class and bounded apply mandatory.

---

## Resumption Point

If this backlog work resumes later, start from:

- `backend/pricing/promote_tcgdex_bridge_to_justtcg_mapping_v1.mjs`
- `docs/audits/JUSTTCG_UPSTREAM_CAPABILITY_AUDIT_V1.md`
- `docs/audits/JUSTTCG_REMAINING_MAPPING_AUDIT_V1.md`
- `docs/contracts/JUSTTCG_REMAINING_MAPPING_CONTRACT_V1.md`

The next valid expansion would be:

- widen bounded TCGdex-bridge apply runs further
- or separately audit whether any exact set + number identity path can be elevated from probe-only to contract-safe

Do not reopen the bridge question from scratch.
