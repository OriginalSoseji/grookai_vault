# CHECKPOINT — Battle Academy Phase 6 Identity Subsystem Architecture V1

Date: 2026-04-02

Status: LOCKED
Scope: Option B identity architecture selection and governance boundary
Phase: BA_PHASE6_IDENTITY_SUBSYSTEM_ARCHITECTURE_V1

---

## 1. Why Phase 6 Promotion Stopped Lawfully

Battle Academy Phase 6 did not fail on identity ambiguity.
It failed on storage compatibility.

Locked facts from the prior stop:

- BA promotion candidates: `328`
- BA identity law:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

- live `card_prints` lacks:
  - `normalized_printed_name`
  - `source_name_raw`
- live uniqueness is still:

```text
uq_card_prints_identity = (game_id, set_id, number_plain, variant_key)
```

- BA release sets are not yet registered in live `sets`

That means current storage cannot lawfully represent the validated BA law directly.

---

## 2. Why Option B Is Now Selected

Option B is:

```text
identity becomes its own governed subsystem
```

This is now the selected architecture because the repo no longer has a single-domain problem.

Battle Academy exposed the storage gap first.
Repo evidence shows the same pressure expands into:

- stamped cards
- staff / prerelease families
- promo-vs-set release splits
- Japanese-domain identity differences

Those pressures already appear in:

- `VERSION_VS_FINISH_CONTRACT_V1.md`
- `JUSTTCG_MAPPING_PLAYBOOK_V1.md`
- printed-identity and public-routing artifacts already tied to `card_prints`

---

## 3. Why BA Alone Did Not Force Option B But BA Plus The Broader Roadmap Does

BA alone proved that a new identity shape exists which current `card_prints` cannot store directly.

That alone could have tempted a BA-only patch.

The repo evidence argues against that patch:

- stamped / staff / prerelease families already create identity pressure beyond current standard-set storage
- Japanese-domain differences are already treated as canonical version differences
- external mappings, pricing, vault, and public routing already expect `card_prints` to remain the stable canonical object

So the problem is not "how to squeeze BA into `card_prints`".
The problem is "how to let identity law grow without destabilizing canon object anchors".

That is why Option B is chosen.

---

## 4. Architecture Summary

Option B splits canonical responsibility into two layers.

### Layer A — `card_prints`

- durable canonical card object
- downstream reference anchor
- home of public `gv_id`
- home of non-identity attributes that should remain stable as identity law evolves

### Layer B — `card_print_identity`

- printed-identity authority object
- home of identity dimensions
- owner of uniqueness
- versioned basis for BA, ENG special-print, and JPN identity law

Hard boundary:

- `card_prints` remains the canonical object
- `card_print_identity` owns printed-identity law

---

## 5. GV ID Decision

Chosen decision:

```text
Option B1
gv_id stays on card_prints and is derived from the one active card_print_identity row
```

Reason:

- public routing already depends on `card_prints.gv_id`
- downstream read simplicity stays intact
- migration risk stays lower when the public token does not move tables

---

## 6. Mapping Reference Decision

Chosen decision:

```text
M1
external_mappings continues to reference card_prints
```

Reason:

- live schema and repo flows already anchor mappings to `card_prints.id`
- mappings represent which canonical card object an external row refers to
- identity authority can move into a subsystem without changing the mapping anchor

---

## 7. Uniqueness Law

Uniqueness must live on `card_print_identity`, not be split across `card_prints`.

The subsystem owns canonical printed-identity uniqueness through:

- `identity_domain`
- `identity_key_version`
- `identity_key_hash`

and any governed domain-specific identity fields required by the domain contract.

Hard rule:

- no identity discriminator may be hidden inside `variant_key` as a shortcut

Battle Academy V1 identity inside the subsystem remains:

```text
(ba_set_code, printed_number, normalized_printed_name, source_name_raw)
```

That law is stored as identity-subsystem law, not as ad hoc `card_prints` widening.

---

## 8. Domain Strategy

The subsystem is chosen because identity pressure already spans multiple governed domains.

Initial required domains:

- `pokemon_eng_standard`
- `pokemon_ba`
- `pokemon_eng_special_print`
- `pokemon_jpn`

Rules:

- each domain defines required discriminator fields
- domain-specific growth happens through governed identity fields or governed payload
- no domain may use fuzzy or heuristic fields
- no domain may silently widen `card_prints` every time identity law changes

---

## 9. Migration Strategy Overview

The migration path is defined, but not executed, in `ba_phase6_identity_migration_strategy_v1.md`.

Required phases:

- Phase A — create `card_print_identity` table and constraints
- Phase B — backfill identity rows for existing canon
- Phase C — bind `card_prints` to active canonical identity rows
- Phase D — adapt `gv_id` derivation path
- Phase E — enable BA promotion using the identity subsystem

No migration is written in this phase.

---

## 10. BA Unblock Conditions

BA promotion remains blocked until all of the following are true:

- `B1` identity subsystem contract approved
- `B2` migration plan approved
- `B3` storage layer replayable from baseline with new identity subsystem
- `B4` BA sets registered lawfully
- `B5` BA promotion candidates mapped into `card_print_identity` without collision
- `B6` `gv_id` derivation path verified under Option B

---

## 11. Explicit Phase Boundary

This phase selects and defines the identity subsystem architecture.
It does not implement schema change and does not promote BA canon rows.

Nothing in this phase:

- writes migrations
- promotes BA rows
- mutates existing canon
- changes external mapping anchors
- changes public `gv_id` ownership

---

## 12. Next Phase

Next lawful artifact:

```text
BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1
```

That phase may translate the approved Option B architecture into exact migration-ready schema and backfill design.
