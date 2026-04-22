# 📜 GROOKAI VAULT — CONTRACT INDEX (AUTHORITATIVE)

This document is the **single source of truth** for all Grookai Vault contracts.

A contract defines a **binding rule, invariant, or system behavior**.
If a contract is listed as **Active** or **Frozen**, it MUST be obeyed.

If a contract is missing from this index, it is not authoritative.

---

## 🧱 FOUNDATIONAL CONTRACTS

| Contract | Status | Description |
|--------|--------|-------------|
| GROOKAI_GUARDRAILS | Active | Global stop-rules and mandatory audit triggers |
| NO_ASSUMPTION_RULE | Active | Prohibits assumption-driven work across the entire project |
| IDENTITY_CONTRACT_SUITE_V1 | Frozen | Canonical rules for set, print, image, and alias identity |
| IDENTITY_PRECEDENCE_RULE_V1 | Frozen | Printed identity supersedes canonical and external identity |
| GV_ID_ASSIGNMENT_V1 | Frozen | docs/contracts/GV_ID_ASSIGNMENT_V1.md — Deterministic public `gv_id` assignment, base token rules, and preserved compact legacy forms for canonical `card_prints` |
| GV_ID_VARIANT_SUFFIX_CONTRACT_V2 | Active | docs/contracts/GV_ID_VARIANT_SUFFIX_CONTRACT_V2.md — Extends `GV_ID_ASSIGNMENT_V1` with controlled suffix variants (`S`, `RH`, `PB`, `MB`) and explicit named identity descriptors for collision-safe printed physical identity |
| IDENTITY_DOMAIN_BASELINE_V1 | Active | docs/contracts/IDENTITY_DOMAIN_BASELINE_V1.md — Founder-declared initialization baseline for existing legacy rows: `pokemon_eng_standard` by default, `tcg_pocket_excluded` for `tcg_pocket`, with proof-based classification still mandatory for future ingestion |
| CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1 | Frozen | docs/contracts/CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1.md — Active identity-subsystem authority for the final BA rollout: `card_prints` remains the stable canonical object and `gv_id` holder, while `card_print_identity` owns printed-identity uniqueness, domain-governed dimensions, and explicit exclusion/reporting of non-canonical domains such as `tcg_pocket` |
| REPRINT_ANTHOLOGY_SET_CONTRACT_V1 | Active | docs/checkpoints/identity/reprint_anthology_identity_model_v1.md — Declares explicit set-level identity models (`standard`, `reprint_anthology`) so lawful anthology same-number reuse is governed in schema instead of hidden set-code carve-outs |
| PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1 | Active | docs/contracts/PERFECT_ORDER_VARIANT_IDENTITY_RULE_V1.md — Same-name same-number identity-bearing rarity/illustration collisions must remain separate canonical rows, distinguished by deterministic `variant_key` and surfaced through derived display labels rather than canonical name mutation |
| PROMO_SLOT_IDENTITY_RULE_V1 | Active | docs/contracts/PROMO_SLOT_IDENTITY_RULE_V1.md — Source-backed stamped promo-family rows with slash-number printed identity must route through the proven underlying base `set_code` instead of collapsing into Black Star promo slot tokens |
| PROMO_FAMILY_IDENTITY_RULE_V1 | Active | docs/contracts/PROMO_FAMILY_IDENTITY_RULE_V1.md — Mixed promo families choose identity space from printed-number shape first: promo-slot tokens stay in-family, while slash-number promo-source rows route to the unique underlying expansion base row before stamped/event `variant_key` is applied |
| EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1 | Active | docs/contracts/EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1.md — Explicit expansion-name stamp phrases route through the named set first, then resolve the unique underlying base row by stripped name plus printed number and total |
| PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1 | Active | docs/contracts/PRIZE_PACK_SERIES_MARKER_IDENTITY_RULE_V1.md — Explicit `Prize Pack Series N` printed markers are identity-bearing and can reuse the stamped pipeline once the underlying base card is unique |
| GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1 | Active | docs/contracts/GENERIC_PLAY_POKEMON_STAMP_IDENTITY_RULE_V1.md — Prize Pack family-only rows with a confirmed Play! Pokemon stamp and no printed series marker resolve to a single generic stamped identity via `variant_key = play_pokemon_stamp`, without series splitting |
| PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1 | Active | docs/contracts/PRINTED_IDENTITY_VS_VARIANT_KEY_RULE_V1.md — For route selection, an exact same-name same-number canon owner remains the lawful printed identity anchor even if current canon stores a non-null `variant_key` such as `alt`; printed number outranks `variant_key` when numbers already differ |
| VARIANT_COEXISTENCE_RULE_V1 | Active | docs/contracts/VARIANT_COEXISTENCE_RULE_V1.md — Same-name same-number rows may coexist on one slot only when each carries a distinct contract-backed identity signal and deterministic `variant_key`, such as base + set-name stamp + generic Play! Pokemon stamp |
| EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1 | Active | docs/contracts/EVENT_AND_PRERELEASE_BASE_ROUTE_RULE_V1.md — Explicit event and prerelease overlays may route to the unique underlying base card by stripped name plus printed number and total when no routed set label is present |
| EVIDENCE_TIER_V1 | Active | docs/contracts/EVIDENCE_TIER_V1.md — Governs evidence strength tiers and the no-guess decision gate for backlog passes that depend on external corroboration |
| PT_VS_DOT_CANONICAL_RULE_V1 | Frozen | Enforces pt-based canonical set codes for subset expansions |
| PRODUCTION_READINESS_GATE_V1 | Active | docs/release/PRODUCTION_READINESS_GATE_V1.md — Grookai Method production-ready DONE gate (LOCKED) |
| DOCUMENTATION_SYSTEM_V1 | Active | docs/contracts/DOCUMENTATION_SYSTEM_V1.md — Official documentation buckets, naming, and governance rules |
| CODEX_GUARDRAILS_CONTRACT_V1 | Active | docs/contracts/CODEX_GUARDRAILS_CONTRACT_V1.md | Governance / Foundations | 2025-12-31 | Hard-stop safety gates for Codex (migrations, staging, scope, target, secrets) |
| REMOTE_SCHEMA_EDIT_POLICY_V1 | Active | docs/contracts/REMOTE_SCHEMA_EDIT_POLICY_V1.md | Governance / Foundations | 2026-03-23 | Forbids normal direct remote schema edits and mandates immediate reconciliation after any emergency edit |
| STABILIZATION_CONTRACT_V1 | Active | docs/contracts/STABILIZATION_CONTRACT_V1.md | Transition-phase authority: Vault truth = `vault_item_instances`; web vault canonical read entry = `getCanonicalVaultCollectorRows`; compatibility vault projection = `v_vault_items_web`; `vault_items` remains present but non-canonical; Pricing engine truth = `v_grookai_value_v1_1`; app-facing pricing surface = `v_best_prices_all_gv_v1`; canonical env names = `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `BRIDGE_IMPORT_TOKEN`; web alias = `NEXT_PUBLIC_SUPABASE_ANON_KEY`; legacy workers/functions/env aliases remain non-authoritative unless explicitly promoted |

---

## 🧬 INGESTION & NORMALIZATION CONTRACTS

| Contract | Status | Description |
|--------|--------|-------------|
| INGESTION_PIPELINE_CONTRACT_V1 | Active | Contract-first staged ingestion via raw_imports |
| EXTERNAL_SOURCE_INGESTION_MODEL_V1 | Active | Shared raw-first canon-bound ingestion model for external catalog and discovery rows before comparison, canon gate, and staged promotion |
| EXTERNAL_DISCOVERY_STAGING_BOUNDARY_V1 | Active | Non-canon staging boundary for external discovery candidates before review and any later canon decision |
| BATTLE_ACADEMY_CANON_CONTRACT_V1 | Frozen | docs/contracts/BATTLE_ACADEMY_CANON_CONTRACT_V1.md — Active BA identity-law authority used by the final rollout; Battle Academy is a curated-product overlay domain whose lawful identity is `(ba_set_code, printed_number, normalized_printed_name, source_name_raw)` and whose promotion gate is strict and fail-closed |
| TCGDEX_SOURCE_CONTRACT_V1 | Active | Deterministic tcgdex ingestion and mapping rules |
| POKEMONAPI_SOURCE_CONTRACT_V1 | Active | PokémonAPI ingestion and normalization rules |
| TCGDEX_MAPPING_WORKER_V2_CONTRACT | Frozen | 100% certainty tcgdex → canonical mapping |
| PRINTED_IDENTITY_CONTRACT_V1 | Frozen | Printed set abbreviation and printed_total rules |
| PRINTED_IDENTITY_PASS_V1 | Frozen | Completed printed identity normalization workflow |

---

## 🖼️ IMAGE & MEDIA CONTRACTS

| Contract | Status | Description |
|--------|--------|-------------|
| IDENTITY_FIRST_IMAGE_COVERAGE_V1 | Active | Image coverage follows identity, not ingestion |
| IMAGE_BACKFILL_CONTRACT_V1 | Active | Controlled, tiered image backfill rules |
| IDENTITY_IMAGE_SYSTEM_V1_5 | Active | Canonical identity image generation and ownership |
| SOURCE_IMAGE_ENRICHMENT_V1 | Active | docs/contracts/SOURCE_IMAGE_ENRICHMENT_V1.md — One-set, exact-match-first source-backed image enrichment. Must fail closed on ambiguous identity groups and never overwrite exact truth with guessed imagery |
| REPRESENTATIVE_IMAGE_CONTRACT_V1 | Active | docs/contracts/REPRESENTATIVE_IMAGE_CONTRACT_V1.md — Governs exact vs representative imagery. Representative images must remain distinct from exact images in storage and UI, and may be used only as transparent, replaceable fallback |
| REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1 | Active | docs/contracts/REPRESENTATIVE_IMAGE_FALLBACK_RULE_V1.md — Governs deterministic sibling-base representative fallback for stamped canonical rows when routed promo imagery is unavailable, without crossing exact-image truth boundaries |
| USER_PHOTO_NORMALIZATION_PIPELINE_V1 | Planned | Backend normalization of user-uploaded images |

---

## 🧪 SCANNER & CONDITION CONTRACTS

| Contract | Status | Lane | File | Date | Description |
|--------|--------|------|------|------|-------------|
| GROOKAI_FINGERPRINT_CONDITION_CONTRACT_V1 | Active | Scanner & Condition | docs/contracts/GROOKAI_FINGERPRINT_CONDITION_CONTRACT_V1.md | — | Option B: legacy `public.scans` quarantined; new append-only `condition_snapshots` (design-first, schema later) |
| NO_DRIFT_SCANNER_CONDITION_PHASE0_PLAN | Planned | Scanner & Condition | docs/checkpoints/NO_DRIFT_SCANNER_CONDITION_PHASE0_PLAN.md | — | Phase 0 checkpoint: define snapshot schema before scan UI; enforce no stored grades/bands and immutable inserts |
| CONDITION_ASSIST_ANALYSIS_WORKER_V1 | Active | Backend Highway | docs/contracts/CONDITION_ASSIST_ANALYSIS_WORKER_V1.md | 2025-12-30 | Append-only analysis worker writes to `condition_snapshot_analyses`; never updates/deletes snapshots; no grades/bands stored |
| SCANNER_SHUTTER_GATE_CONTRACT_V1 | Active | Scanner & Condition | docs/contracts/SCANNER_SHUTTER_GATE_CONTRACT_V1.md | 2026-02-14 | Single-source shutter gate: derive `_canShoot` from `OverlayMode.ready` and `_takingPicture`; no independent readiness flag |

---

## 🗃️ VAULT & OWNERSHIP CONTRACTS

| Contract | Status | Description |
|--------|--------|-------------|
| GV_VAULT_INSTANCE_CONTRACT_V1 | Active | `GV-VI` is the universal ownership, trade, sale, and sharing anchor for every owned vault instance |

---

## 💰 PRICING & MARKETPLACE CONTRACTS

| Contract | Status | Description |
|--------|--------|-------------|
| PRICING_ENGINE_V1 | Active | Active listings-based pricing engine |
| PRICING_ENGINE_V1_5 | Active | Condition curve pricing (NM → DMG) |
| PRICING_MONITOR_V1 | Planned | Scheduler-driven pricing refresh system |
| MARKETPLACE_GUARDRAILS_V1 | Planned | Trust, fraud, and listing safety rules |

---

## 🧊 FREEZE DECLARATIONS (BINDING)

| System | Status | Notes |
|------|--------|-------|
| Printed Identity Pass V1 | Frozen | Standard SV sets complete |
| Special `.5` Sets | Closed | Requires separate reconstruction phase |
| Hell in .5 | Closed | Postmortem completed and archived |

---

## OPERATIONAL PLAYBOOK REFERENCES (NON-CONTRACT)

These files are execution guides and indexes, not new contracts. They document how to apply the active contracts above during future Prize Pack backlog work.

| Playbook | Status | Description |
|--------|--------|-------------|
| PRIZE_PACK_BACKLOG_EXECUTION_PLAYBOOK_V1 | Active Reference | docs/playbooks/PRIZE_PACK_BACKLOG_EXECUTION_PLAYBOOK_V1.md — End-to-end operational playbook for Prize Pack backlog lanes, stop rules, checkpointing, and resume prompts |
| PRIZE_PACK_BACKLOG_DECISION_TREE_V1 | Active Reference | docs/playbooks/PRIZE_PACK_BACKLOG_DECISION_TREE_V1.md — Row-state decision tree for route, evidence, acquisition, READY batch, cleanup, special-family, and freeze paths |
| PRIZE_PACK_WORKER_INDEX_V1 | Active Reference | docs/playbooks/PRIZE_PACK_WORKER_INDEX_V1.json — Machine-readable index of Prize Pack-related workers, worker families, inputs, outputs, contracts, and unsafe usage |
| PRIZE_PACK_BACKLOG_BUCKET_DEFINITIONS_V1 | Active Reference | docs/playbooks/PRIZE_PACK_BACKLOG_BUCKET_DEFINITIONS_V1.md — Final bucket definitions for promoted, DO_NOT_CANON, acquisition-blocked, near-hit-only, no-hit, duplicate/error, and special-family rows |
| PRIZE_PACK_SOURCE_ACQUISITION_GUIDE_V1 | Active Reference | docs/playbooks/PRIZE_PACK_SOURCE_ACQUISITION_GUIDE_V1.md — Official-source acquisition, PDF validation, JSON normalization, and source-upgrade guide |

---

## 📌 CONTRACT GOVERNANCE

Rules:
- A contract must be listed here to be enforceable
- Status meanings:
  - **Planned**: Not yet active
  - **Active**: Binding and enforced
  - **Frozen**: Binding and immutable
  - **Closed**: Completed and not reopenable
- Changing a contract requires an explicit audit and version bump
- Silent edits are prohibited

This index exists to prevent rule sprawl, ambiguity, and drift.
