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
