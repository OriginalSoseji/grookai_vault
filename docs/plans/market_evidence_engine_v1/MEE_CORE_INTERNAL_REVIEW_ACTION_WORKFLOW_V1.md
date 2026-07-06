# MEE Core Internal Review Action Workflow V1

Status: plan only

## Summary

The review dashboard now shows internal queues, but operators still need a controlled way to move each row through review. This package defines that workflow without applying schema, writing rows, or publishing prices.

## Proposed Implementation Phases

1. Add append-only internal action event schema.
2. Add service-role-only action function with optimistic locking.
3. Add read model for action history and current disposition.
4. Build internal review UI on top of dashboard queues.
5. Only after review actions exist, design a separate publication-gate contract.

## Current Audit

- Findings: 0
- Potentially confirmable raw/single or slab rows: 270
- Dashboard queue rows: 2152
- Blocker rows: 1526

## Boundary

No remote migration apply, DB writes, provider calls, source fetches, pricing writes, public pricing views, app-visible pricing, public rollups, identity/vault/image writes, deletes, upserts, merges, migrations, or global apply.
