# DOCUMENTATION_SYSTEM_V1

## Status
- Active

## Purpose
- Define the official Grookai Vault documentation system.
- Reduce discoverability drift without destroying historical repo memory.

## Scope
- Applies to all repo-native documentation under `docs/`.
- Governs bucket meaning, naming, placement, and minimal knowledge-preservation rules.

## Official Buckets

- `docs/audits/`
  - Reality-first inspection, evidence, verification, drift analysis, root-cause work.
- `docs/contracts/`
  - Binding system law, invariants, interface rules, authority boundaries.
- `docs/checkpoints/`
  - Stable-state milestone locks and “what is now true” summaries.
- `docs/incidents/`
  - Failure, impact, root cause, repair, and prevention records.
- `docs/ops/`
  - Repeatable operational runbooks and healthchecks.
- `docs/templates/`
  - Standard templates for doc creation.
- `docs/playbooks/`
  - Deeper tactical procedures and guided execution workflows.
- `docs/release/`
  - Release-readiness, ship hygiene, drift scans, and release verification.
- `docs/plans/`
  - Temporary planning artifacts that are not yet authoritative truth.

## Naming Guidance

- Audits:
  - `TOPIC_AUDIT_V1.md`
  - `YYYY-MM-DD_topic_audit.md` when tied to a dated event or incident
- Contracts:
  - `TOPIC_CONTRACT_V1.md`
  - system-specific names like `PRICING_QUOTA_GUARD_V1.md` may remain when already clear
- Incidents:
  - `YYYY-MM-DD_short_slug.md`
- Checkpoints:
  - `YYYY-MM-DD_short_slug.md`
  - existing milestone-style names may remain when already established
- Ops:
  - `TOPIC_RUNBOOK_V1.md`
  - existing stable ops naming may remain when already consistent

## Bucket Selection Rules

- Create an audit when the goal is to prove current reality, inspect drift, verify behavior, or find root cause.
- Create a contract when the goal is to define a binding rule, truth surface, or invariant that future work must obey.
- Create an incident when a meaningful failure happened and the repo should preserve what happened, why, and how it was repaired.
- Create a checkpoint when a change set meaningfully stabilizes a system and future work needs a locked summary of what is now true.
- Create an ops doc when the procedure is repeatable and operator-facing.
- Create a playbook when the workflow is tactical, guided, and deeper than a short runbook.
- Create a plan only when the work is still temporary or proposal-stage.

## Knowledge Preservation Rules

- Meaningful system changes should preserve knowledge in repo-native docs.
- Not all work requires every doc type.
- Major changes often produce multiple artifacts, for example:
  - audit + contract
  - audit + incident
  - contract + checkpoint
  - release doc + ops doc

## Allowed Behavior

- Add structure, indexes, templates, and selective moves to improve discoverability.
- Preserve older docs in place when classification is uncertain.
- Use `docs/INDEX.md` as the top-level navigation layer.
- Keep specialized historical buckets when they still carry useful repo memory.

## Forbidden Behavior

- Destructive mass-rewrites of historical docs just to satisfy bucket purity.
- Silent knowledge loss through deletion or aggressive renaming.
- Treating plans or ad hoc notes as authoritative system law.
- Creating duplicate authoritative docs when an existing contract already governs the topic.

## Documentation Trigger Rule

This rule prevents over-documentation, under-documentation, and ambiguity in when to record system knowledge.

Not all work requires documentation.

However, documentation is REQUIRED when any of the following occur:

- A system invariant is introduced or changed → CONTRACT
- A defect required investigation → AUDIT + INCIDENT
- A stable milestone is reached → CHECKPOINT
- A repeatable process is created → OPS
- A complex solution required reasoning → AUDIT

If no rule is triggered, documentation is optional.

## Verification

- `docs/INDEX.md` exists and explains the official system.
- Official buckets exist.
- Templates exist in `docs/templates/`.
- Selective moves update references when paths change.
- Non-doc project code remains untouched during docs-only structure passes.

## Related Artifacts

- `docs/INDEX.md`
- `docs/CONTRACT_INDEX.md`
- `docs/templates/AUDIT_TEMPLATE.md`
- `docs/templates/CONTRACT_TEMPLATE.md`
- `docs/templates/INCIDENT_TEMPLATE.md`
- `docs/templates/CHECKPOINT_TEMPLATE.md`
- `docs/templates/OPS_TEMPLATE.md`
