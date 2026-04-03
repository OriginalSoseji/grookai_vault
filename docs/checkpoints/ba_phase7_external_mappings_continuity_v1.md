# CHECKPOINT — BA Phase 7 External Mappings Continuity V1

Date: 2026-04-02

Status: LOCKED
Scope: Exact continuity plan for `external_mappings` under Option B
Phase: BA_PHASE7_IDENTITY_SUBSYSTEM_MIGRATION_DESIGN_V1

---

## 1. Locked Boundary

- `external_mappings` continues to reference `card_prints`
- the identity subsystem does not replace `card_prints` as the mapping anchor
- backfill and BA promotion must preserve this invariant

external_mappings continues to reference `card_prints`.

---

## 2. M1 — Existing Mappings During Identity Backfill

Rule:

- existing `external_mappings.card_print_id` rows do not move
- identity backfill reads `card_prints` and existing mappings as supporting evidence only
- no anchor rewrite is required to introduce `card_print_identity`

Operational result:

- current mapping consumers continue to function while identity rows are introduced beside existing canon

---

## 3. M2 — BA Mappings After Promotion

Rule:

- after BA canonical rows exist, BA source mappings continue to point to the resulting BA `card_prints.id`
- any provenance about underlying reference identity belongs in governed metadata or identity payload, not in the mapping anchor

Operational result:

- BA mapping semantics remain canon-object first
- the identity subsystem informs which BA `card_print` is lawful, but the external source still maps to `card_prints`

---

## 4. M3 — Why Mappings Must Not Point To `card_print_identity` In V1

Reason set:

- live schema already anchors mappings to `card_prints.id`
- downstream pricing, catalog, and vault systems expect the canonical object anchor to remain stable
- identity rows are internal authority objects, not the public foreign-key target
- moving mappings to identity rows would create avoidable breakage before the subsystem is proven in production

Hard rule:

- Phase 8 migrations must preserve `external_mappings.card_print_id -> card_prints.id`

No SQL is written in this phase.
