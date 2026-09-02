# Scanner State Notice V1

Status: Active

## Purpose

Collectors must receive an honest scanner-status notice before entering any
scanner flow. The notice states that card, printing, and variant recognition
can still be missed or misidentified and that every match should be reviewed
before it is added to the Vault.

## Contract

- The shared scanner entry point owns the notice gate.
- A collector must explicitly choose `OK` or `Go back`.
- System back gestures must not bypass the explicit choice.
- `Go back` must not open a scanner route.
- Concurrent scanner-entry taps must collapse into one active flow.
- `Do not show again` is an optional device-local preference.
- The dismissal preference must not write to Supabase or alter account data.
- A preference read or write failure must not create scanner or database
  authority.
- The notice does not weaken canonical identity, printing, or variant review.
- Scanner results remain suggestions that the collector must verify.

## Boundaries

This contract changes only scanner-entry communication. It does not change
scanner identity logic, canonical data, Vault writes, pricing, or evidence
authority.
