# Security Advisor View Authority Hardening 20260807 V1

## Context

The production Supabase Security Advisor reported five error-level view findings:

- `v_card_stream_v1`
- `v_wall_cards_v1`
- `v_section_cards_v1`
- `v_card_contact_targets_v1`
- `v_vault_mobile_pricing_targets_v1`

These views are consumed by the deployed web client and Build 284 mobile clients. Their names, columns, grants, visibility rules, and row behavior therefore had to remain stable while the unsafe authority model was removed.

## Problem

The five views were owner-authority views. Replacing them directly with ordinary invoker views would have broken reads because the client roles do not receive direct access to the underlying private tables. Leaving them unchanged would preserve functionality by bypassing the intended role boundary.

## Risk

- A direct invoker conversion could break Pulse, Wall, Vault, section, contact-target, or pricing reads.
- Broad function grants could expose authenticated pricing data to anonymous callers.
- Rebuilt views could silently change columns, row counts, or public-sharing behavior.
- A partial migration could leave a mixed authority model in production.

## Decision

Migration `20260807133000_security_advisor_view_authority_hardening_v1.sql` preserves each public view as a `security_invoker` and `security_barrier` wrapper over a bounded, fixed-search-path function. The functions contain the existing row predicates and expose only the established view contracts.

The pricing wrapper remains authenticated-only. The four public read wrappers retain their exact `anon`, `authenticated`, and `service_role` read behavior. No client contract, base-table grant, canonical identity, pricing value, ownership row, or collector data was changed.

## Alternatives Rejected

- Granting app roles direct access to the underlying tables
- Leaving the owner-authority views in place
- Changing deployed view names or response columns
- Moving this repair into clients and waiting for a new mobile release
- Suppressing the advisor findings without changing database authority

## Migration Applied

- Migration: `20260807133000_security_advisor_view_authority_hardening_v1.sql`
- Producing commit: `a730b0cc245730055a48d3d359218c81d5256203`
- Apply method: linked Supabase CLI migration push
- Migration history: local and production agree through `20260807133000`
- Pre-apply collision check: exactly one pending local migration
- Persistent data mutation: none

## Production Proof

The permanent readback passed every required check:

- all five views exist;
- all five preserve their pre-apply column contracts;
- all five are `security_invoker` and `security_barrier` views;
- all five preserve pre-apply row counts and full-row fingerprints;
- all five wrapper functions exist and use a fixed `pg_catalog, public` search path;
- no public security-definer function is missing a fixed search path;
- exact view grants match the frozen contract;
- anonymous reads succeed for the four public views;
- anonymous pricing access is denied;
- authenticated pricing access returns the exact expected `1802` rows.

The post-apply web smoke passed `22/22` route cases and `2/2` personal-action continuation cases in isolated signed-out contexts with no visible broken images. Samsung Build 284 then loaded Pulse, Wall, and Vault without an error state; Wall displayed 31 cards and Vault displayed 1,008 cards, 215 unique cards, and 53 sets.

## Current Truths

- The five error-level view-authority findings have been remediated in production at the database contract level.
- The database readback is the governing proof. A dashboard screenshot is optional corroboration, not the authority.
- Existing deployed clients continue to use the same view names and columns.
- The broader release gate `security_privacy_and_operations` remains `partial` because account-deletion execution, analytics, crash reporting, support, terms, and monitoring still require final-candidate operational evidence.
- No OpenAI model or paid API was used for this remediation. Token usage and model cost are `0`.

## Invariants

- Public views must remain bounded and expose only the established columns.
- Authenticated Vault pricing must remain scoped to `auth.uid()`.
- Anonymous callers must never gain access to Vault pricing targets.
- Public sharing and block predicates must not be weakened.
- Wrapper functions must keep a fixed search path.
- Base-table grants must not be widened to solve client access.
- Migration history must remain linear and reconciled.

## What Must Never Be Broken

- Pulse, Wall, Vault, section, contact-target, and pricing reads used by deployed clients
- Collector privacy and block enforcement
- Exact ownership and pricing row scope
- Signed-out route behavior and preserved login destinations
- Rollback isolation for future security migrations

## Permanent Evidence

- `docs/audits/release_completion_v1/security_advisor_views_pre_apply_readback_v1.json`
- `docs/audits/release_completion_v1/security_advisor_view_authority_guarded_dry_run_v1.json`
- `docs/audits/release_completion_v1/security_advisor_view_authority_db_push_dry_run_v1.txt`
- `docs/audits/release_completion_v1/security_advisor_view_authority_production_apply_v1.txt`
- `docs/audits/release_completion_v1/security_advisor_view_authority_production_readback_v1.json`
- `docs/audits/release_completion_v1/security_advisor_view_authority_production_proof_v1.json`
- `docs/audits/release_completion_v1/security_advisor_view_authority_post_apply_web_smoke_v1/2026-08-07T13-07-45-177Z/REPORT.md`
- `docs/audits/release_completion_v1/security_advisor_view_authority_post_apply_android_v1/REPORT.md`
- `docs/audits/release_completion_v1/security_advisor_view_authority_artifact_hashes_v1.json`
- `docs/audits/release_completion_v1/security_advisor_view_authority_artifact_hashes_v1.json.sha256`

## Explicit Next Gate

Complete final-candidate RLS/privacy/account-deletion verification and the analytics, Crashlytics, support, terms, and monitoring readback. Keep that work separate from this proven view-authority repair, then execute the remaining release journeys before freezing the 72-hour candidate.
