# Grookai Vault — Master Engineering Rulebook (V1)

This rulebook consolidates all engineering contracts, guardrails, and workflows across Grookai Vault. It is the single reference for migrations, backend architecture, ingestion, pricing, environments, secrets, and developer conduct. Link here before starting any new work.

# Zero-Assumption Rule (Mandatory)
- Never assume environment, project_ref, DB contents, data presence, or ingestion success.
- Any conclusion about data/state must be backed by either direct SQL results, explicit file/env inspection, or explicit user confirmation.
- A query returning `0` rows is not proof of data loss; first run the Env / DB Sanity Check and confirm the active environment.

## Canonical Environment (Production/Staging) Invariants
- Canonical Supabase project_ref: `ycdxbpibncqcchqiihfz`.
- Required minimum counts (blockers if below):
  - `card_prints >= 40,000`
  - `sets >= 150`
  - `card_print_traits >= 5,000`
- `price_observations` and `card_print_price_curves` may be 0 if pricing has not run yet.
- If the above invariants fail, all implementation/audit work is **BLOCKED** with warning: “Environment mismatch — fix before proceeding.”

## Canonical Maturity Gate Scope (Active Clarification)
- The `card_prints >= 40,000` gate remains a hard blocker for:
  - canon-expanding write systems
  - canonical schema changes tied to truth mutation
  - direct promotion into `card_prints`
  - any write system that mutates canonical truth layers
- The same gate does **not** block non-canon external discovery staging layers when their explicit purpose is:
  - preserving external discovery candidates
  - holding review-state candidates
  - preserving provenance before canon decision
  - writing outside canonical truth tables
- Allowed below `40,000`:
  - raw ingestion improvements
  - read-only normalization, matching, and canon-gate logic
  - non-canon staging systems for external discovery candidates
  - provenance-preserving review queues that do not mutate canon
- Still blocked below `40,000`:
  - new direct canon writers
  - auto-promotion into `card_prints`
  - schema or workers that mutate canonical truth layers without staging and review
  - any external source bypassing canon gate or review
- Staging is a review boundary, not a truth boundary.
- This clarification exists specifically to prevent unsafe canon writes in special-case-heavy domains such as Pokemon while preserving a lawful buffer before canon acceptance.
- This clarification does not weaken printed identity authority or any canon-first identity contract.

## Env / DB Sanity Check (Required for Supabase-backed work)
Before any L2/L3 audit or implementation:
1) Confirm the active project_ref by comparing `SUPABASE_URL` with `project_ref` in `supabase/config.toml`.
2) Run:
   ```sql
   select count(*) from card_prints;
   select count(*) from sets;
   select count(*) from card_print_traits;
   ```
3) Compare against the Canonical Environment Invariants.
4) If invariants fail, declare the task BLOCKED until environment routing is fixed, except for non-canon external discovery staging work explicitly allowed by the Canonical Maturity Gate Scope clarification above.

## 1. Migration Maintenance Contract
- Idempotent, replay-safe migrations only; no destructive ops. Follow guards for fresh DBs.
- Replay trifecta before declaring schema "done": `supabase db push`, `supabase db reset` + `supabase db push --local`, `supabase db pull`.
- No direct DB edits outside migrations. Card-print UUID/FK rules are sacred.
- Before any schema work: run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase AuditLinkedSchema`.
- Before any remote apply: run `pwsh -NoProfile -File .\scripts\migration_preflight_strict.ps1 -Phase PrePush -ExpectedLocalOnlyIds <ids>`.
- `supabase db reset --local` is mandatory replay proof for schema work.
- Source: `docs/contracts/GV_MIGRATION_MAINTENANCE_CONTRACT.md`.

## 2. Migration Drift Guardrail
- `scripts/drift_guard.ps1` is advisory only and not a safe apply gate.
- `scripts/migration_preflight_strict.ps1` is the fail-closed migration gate.
- No remote-only migrations (Remote has version, Local blank). Fix drift first via `docs/playbooks/REMOTE_SCHEMA_DRIFT_RECOVERY_V1.md`.
- Local-only migrations must match the exact expected payload to push.
- Pointer: Migration Drift Guardrail section in `docs/contracts/GV_MIGRATION_MAINTENANCE_CONTRACT.md`.

## 3. Backend Architecture Contract
- Highway vs Edge: heavy logic lives in backend workers (service role); Edge Functions stay thin/public.
- No business logic in Flutter client. Backend (Supabase + workers) is source of truth.
- No hand-rolled JWTs or raw HTTP hacks to Supabase; use the shared backend client.
- Service-role keys only in workers/CI, never client-side.
- Source: `docs/BACKEND_ARCHITECTURE.md`, `docs/WORKERS_GUIDE.md`.

## 4. Environment Separation Contract
- Distinct local/staging/prod; never point dev builds at prod.
- `.env.local` is authoritative for local; avoid stray `.env` overriding backend workers.
- Supabase URL per environment; keep names stable, values differ by env.
- Make intent explicit when targeting remote vs local (`--local` flags, config).

## 5. Secrets Contract
- Follow `docs/contracts/GV_SECRETS_CONTRACT_v1.md`.

### Current Active Status
- Canonical env names are `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `BRIDGE_IMPORT_TOKEN`.
- Legacy names such as `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and framework aliases such as `NEXT_PUBLIC_SUPABASE_ANON_KEY` may remain present for compatibility.
- Compatibility aliases are not equal-authority contract names for new code.

- Publishable key only in frontend/Edge; service-role only in backend/CI. Never embed secrets in Flutter.

## 6. Schema / Canonical Identity Contract
- Card prints are canonical: UUID-only `card_prints.id`.
- Set-level identity behavior is explicit:
  - `public.sets.identity_model = 'standard' | 'reprint_anthology'`
- Standard sets enforce number / printed-identity-modifier / variant uniqueness.
- Reprint anthology sets enforce number + `print_identity_key` uniqueness and must not rely on raw `(set_id, number_plain)` uniqueness.
- All child tables reference `card_prints.id uuid`; no duplicates; set_id non-null in production.
- Sources:
  - `docs/contracts/GV_SCHEMA_CONTRACT_V1.md`
  - `docs/checkpoints/identity/reprint_anthology_identity_model_v1.md`

## 7. Ingestion Pipeline Contract
- All external data flows: `raw_imports → normalization → mapping_conflicts → external_mappings → card_prints`.
- No direct writes to canonical tables; raw_imports is the only staging ingress.
- Mapping resolves to card_prints before downstream use.
- Sources: `docs/ingestion/RAW_IMPORTS_AUDIT.md`, `docs/audits/AUDIT_EBAY_MAPPING_L2.md`, `docs/audits/AUDIT_MAPPING_ENFORCEMENT_L2.md`.

## 8. Enrichment Contract
- Enrichment is non-destructive: traits/metadata JSONB fields only; never mutate canonical identity.
- Domain-specific trait rules apply; preserve card_print identity and uniqueness.
- Source: enrichment/mapping audits above.

## 9. Pricing Engine V3 Contract
- Sources: price observations (eBay first). Listing intelligence includes skip reasons.
- Condition curves: NM/LP/MP/HP/DMG; confidence derived from samples.
- Snapshots: `card_print_price_curves` table; `card_print_latest_price_curve` view for latest per print.
- Clients read precomputed views; no pricing logic in Flutter.
- References: pricing docs/audits and workers.

## 10. Worker Lane Contract
- Workers use service-role via shared backend client; Edge functions use restricted keys and stay thin.
- Heavy lifting in workers; Edge validates/authenticates then hands off.
- Logging: clear domain prefixes; health checks are fast and DB-safe.
- Source: `docs/WORKERS_GUIDE.md`, `docs/BACKEND_ARCHITECTURE.md`.

## 11. Developer Workflow Contract
- Start local Supabase correctly; respect env separation.
- Use Codex tasks for changes; follow Audit Rule levels (L1/L2/L3).
- For schema work, follow `Audit → Classify → Plan → Apply → Verify`.
- Run strict migration preflight before schema work and before remote apply.
- No Studio schema edits; if an emergency remote edit occurs, stop and follow `docs/playbooks/REMOTE_SCHEMA_DRIFT_RECOVERY_V1.md`.
- CI uses highway (workers) with injected secrets, not public endpoints.

## 12. Production Readiness Rule V1
- Production-Ready DONE Gate is mandatory across all domains (workers, Edge, DB, client features that affect data). See `docs/release/PRODUCTION_READINESS_GATE_V1.md` for the locked requirements (determinism, failure persistence, observability, trust boundaries, replayable verification, checkpoint discipline).

### Env / DB Sanity (Mandatory for any Supabase-backed feature)
- Applies to all Audit Rules (L1/L2/L3) that touch Supabase data (UI, pricing, ingestion, vault, auth).
- Steps:
  1) Confirm Flutter and Supabase CLI point to the same project by comparing `SUPABASE_URL` in the active env file with `project_ref` in `supabase/config.toml`.
  2) On that project, run:
     ```
     select count(*) from card_prints;
     select count(*) from v_vault_items;
     ```
  3) If `card_prints = 0` or clearly wrong, the audit result must be: “❌ BLOCKED: Env/DB mismatch. Fix routing before implementation.”

## 12. Forbidden Moves
- Never modify schema in Supabase Studio or ad-hoc SQL tabs.
- Never bypass migrations or migration list checks.
- Never treat `scripts/drift_guard.ps1` as sufficient proof that apply is safe.
- Never continue migration work after an emergency remote edit until reconciliation is complete.
- Never write business logic in Flutter or client-side pricing logic.
- Never bypass ingestion pipeline to write canon directly.
- Never store secrets in Flutter or expose service-role keys.
- Never point dev/staging builds at prod Supabase.

## 13. Special Set Reconstruction (Frozen)
- Special/split sets (`sv08.5`, `sv10.5b`, `sv10.5w`) follow the frozen runbook and contract:
  - `docs/SPECIAL_SET_IDENTITY_RECONSTRUCTION_V1.md`
  - `docs/SPECIAL_SET_RECONSTRUCTION_CONTRACT_V1.md`
- Printed Identity Pass V1 must not be run on these sets.

## 14. Guardrails (Authoritative)
- `docs/GROOKAI_GUARDRAILS.md`: Authoritative stop-rules and audit triggers for Grookai Vault.

## 15. Contract Index
- `docs/CONTRACT_INDEX.md`: Authoritative index of all Grookai Vault contracts and their status.

## Preflight Gate V1
- Mechanical preflight gate for destructive workers. See `docs/PREFLIGHT_GATE_V1.md`.
- Example:
  - `$env:GROOKAI_PREFLIGHT_ACK="1"`
  - `.\scripts\preflight_gate.ps1 -Command "node backend/some_worker.mjs --apply" -Destructive`
  - `Remove-Item Env:\GROOKAI_PREFLIGHT_ACK`

---

This rulebook is a living document. Future Codex tasks and onboarding should reference this file first, then the linked contracts for detail. Keep it updated as rules evolve.***
