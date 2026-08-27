# Catalog Shadow Automation V1

## Status

`ACTIVE`

## Purpose

Background catalog automation discovers and preserves the largest supportable
cross-TCG catalog without mutating production identity or app-visible state.

## Permitted Persistence

- immutable source evidence;
- normalized candidate indexes;
- data-only Git history;
- workflow artifacts;
- health and evidence-queue issues.

These records are shadow evidence. They are not canonical identity.

## Forbidden Background Effects

Scheduled catalog automation must not:

- write any production database table;
- dispatch a canonical writer;
- upload or delete Storage objects;
- update image pointers;
- write pricing or publication state;
- write Vault or collector state;
- activate app visibility;
- treat a candidate as canonical because one provider repeated it.

## Runtime Contract

- Scheduled catalog workflows declare `CATALOG_AUTOMATION_MODE=shadow-only`.
- Database reconciliation starts a read-only transaction.
- Scheduled database sessions set `default_transaction_read_only=on`.
- Promotion candidates are copied into an evidence-only shadow queue.
- No child promotion worker is executed by a scheduled workflow.
- MTG supervision observes the existing catalog and produces a plan without
  dispatching the hidden catalog writer.
- Pokemon language refreshes may commit allowlisted candidate artifacts, but
  downstream dispatch is limited to read-only discovery and shadow
  reconciliation.

## Promotion Boundary

Canonical promotion is a separate founder-authorized project. Enabling it
requires a new contract, frozen payload, explicit approval, bounded writer,
readback, rollback proof, and checkpoint. It cannot be enabled by changing a
scheduled catalog input.
