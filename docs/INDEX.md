# Grookai Vault Documentation Index

This is the official documentation system for Grookai Vault.

The goal is clarity without destructive churn:
- use explicit buckets for new docs
- keep older high-value docs discoverable
- move files only when classification is obvious
- preserve historical repo memory when classification is uncertain

## Official Buckets

### `docs/audits/`
- Reality-first inspection documents.
- Use for evidence, drift analysis, current-state verification, and root-cause work.

### `docs/contracts/`
- System law and invariants.
- Use for authoritative boundaries, truth surfaces, interface rules, and governance.

### `docs/checkpoints/`
- Stable-state milestone summaries.
- Use when a phase is complete enough to lock what is now true.

### `docs/incidents/`
- Failure and repair records.
- Use for production incidents, regressions, and postmortems with verified facts.

### `docs/ops/`
- Repeatable operational runbooks.
- Use for worker operations, healthchecks, deployments, and recurring procedures.

### `docs/templates/`
- Standard templates for new docs.
- Start here when creating a new audit, contract, incident, checkpoint, or ops doc.

### `docs/playbooks/`
- Tactical procedures and guided workflows.
- Use for deeper, operator-guided execution paths that go beyond short runbooks.

### `docs/release/`
- Release-readiness and repo hygiene.
- Use for release gates, drift scans, cleanup audits, and ship-specific verification.

### `docs/plans/`
- Temporary planning artifacts.
- Use for proposed work that is not yet authoritative system truth.

## Where New Docs Go

- Current-state inspection or verification: `docs/audits/`
- Binding system rule or invariant: `docs/contracts/`
- Major stable-state summary after meaningful change: `docs/checkpoints/`
- Failure record with symptoms, root cause, and repair: `docs/incidents/`
- Repeatable operator procedure: `docs/ops/`
- Guided tactical workflow: `docs/playbooks/`
- Release hardening or ship hygiene: `docs/release/`
- Temporary planning artifact: `docs/plans/`

## Current Key Docs

- [Documentation System](/c:/grookai_vault/docs/contracts/DOCUMENTATION_SYSTEM_V1.md)
- [Contract Index](/c:/grookai_vault/docs/CONTRACT_INDEX.md)
- [Stabilization Contract](/c:/grookai_vault/docs/contracts/STABILIZATION_CONTRACT_V1.md)
- [Pricing Scheduler Contract](/c:/grookai_vault/docs/contracts/PRICING_SCHEDULER_CONTRACT_V1.md)
- [Pricing Surface Contract](/c:/grookai_vault/docs/contracts/PRICING_SURFACE_CONTRACT_V1.md)
- [Pricing Schema Audit](/c:/grookai_vault/docs/audits/PRICING_SCHEMA_AUDIT_V1.md)
- [Resolver Stress Test](/c:/grookai_vault/docs/audits/RESOLVER_STRESS_TEST_V1.md)
- [Card Interaction Network + Execution Layer Checkpoint](/c:/grookai_vault/docs/checkpoints/2026-03-24_card_interaction_network_execution_layer_p3.md)
- [Pricing Highway Worker Runbook](/c:/grookai_vault/docs/ops/PRICING_HIGHWAY_WORKER_V1.md)
- [Production Readiness Gate](/c:/grookai_vault/docs/release/PRODUCTION_READINESS_GATE_V1.md)

## Current Structure Notes

Buckets already aligned well:
- `docs/audits/`
- `docs/contracts/`
- `docs/checkpoints/`
- `docs/ops/`
- `docs/playbooks/`
- `docs/release/`
- `docs/plans/`

Buckets preserved but not part of the new official top-level system:
- `docs/backend/`
- `docs/blueprints/`
- `docs/enrichment/`
- `docs/ingestion/`
- `docs/legacy_migrations_v0/`
- `docs/rules/`
- `docs/sql/`
- `docs/tests/`

These remain in-repo for historical context and specialized reference. They are not being force-moved in this pass.

## Legacy / Pending Classification

The following top-level docs remain in place because their best long-term home is not fully obvious without broader cleanup:
- `docs/BACKEND_ARCHITECTURE.md`
- `docs/BASELINE_V1.md`
- `docs/CHECK_EBAY_PHASE1_STATUS.md`
- `docs/EBAY_INTEGRATION_OVERVIEW.md`
- `docs/EBAY_SELLER_SYNC_V1.md`
- `docs/GROOKAI_GUARDRAILS.md`
- `docs/GROOKAI_RULEBOOK.md`
- `docs/IMPORT_PRICES_PIPELINE.md`
- `docs/MIGRATION_HEALTHCHECK_20251125.md`
- `docs/PLAYBOOK_INDEX.md`
- `docs/PREFLIGHT_GATE_V1.md`
- `docs/REMOTE_IMPORT_POKEMON_V1.md`
- `docs/WORKERS_GUIDE.md`

## Templates

Use:
- [Audit Template](/c:/grookai_vault/docs/templates/AUDIT_TEMPLATE.md)
- [Contract Template](/c:/grookai_vault/docs/templates/CONTRACT_TEMPLATE.md)
- [Incident Template](/c:/grookai_vault/docs/templates/INCIDENT_TEMPLATE.md)
- [Checkpoint Template](/c:/grookai_vault/docs/templates/CHECKPOINT_TEMPLATE.md)
- [Ops Template](/c:/grookai_vault/docs/templates/OPS_TEMPLATE.md)
