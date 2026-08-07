# Card Interaction Exact Printing Production Checkpoint V1

## Context

The release requirement is that every card surface identify the exact variant when evidence exists. Card-centered messages were the remaining exception because their durable identity stopped at the parent `card_print_id`.

## Problem

Normal, Holo, Reverse Holo, stamped, and other child printings could collapse into one conversation. Existing rows could not be safely repaired because the historical source copy did not always preserve a child assignment.

## Risk

- A collector could discuss the wrong physical printing.
- Reply, unread, archive, and close state could cross printing boundaries.
- Guessing a historical child would convert missing evidence into false identity.
- Expanding view/table privileges during repair could weaken RLS.

## Decision

Persist nullable `card_printing_id` on new interactions and their group-state rows. Scope new duplicate detection, grouping, replies, unread state, archive state, close state, images, and labels by the exact child. Preserve every historical null and render it as `Printing not recorded`.

## Alternatives Rejected

- **Infer historical children:** rejected because parent identity is insufficient evidence.
- **Create one thread per parent:** rejected because it preserves the ambiguity.
- **Require child identity for every row:** rejected because legitimate legacy and explicitly unassigned copies exist.
- **Backfill from current Vault state:** rejected because current state does not prove historical state.

## Migration Applied

- Migration: `20260806220000_card_interactions_exact_printing_v1.sql`
- Source commit: `7b0bbf4fdc7e3afd18a0a931a23bbd7c287d60f7`
- Migration SHA-256: `856571653bae3f07cf84fecebad707a99ffc8ba26d3f0a07916fb063b11e1075`
- Production status: applied and present in remote migration history.
- Apply report: `docs/audits/release_completion_v1/CARD_INTERACTIONS_EXACT_PRINTING_PRODUCTION_APPLY_20260806_V1.md`

## Production Proof

- Schema/security readback: `docs/audits/release_completion_v1/card_interactions_exact_printing_production_readback_v1.json`
- Rollback-only RLS smoke: `docs/audits/release_completion_v1/card_interactions_exact_printing_production_rls_smoke_v1.json`
- Production web build: passed.
- Full Node contract suite: `1530/1530` passed.
- Full Flutter suite: `571/571` passed.
- Repository shipcheck: passed.
- Local Supabase reset, schema readback, grant readback, trigger behavior, and participant/outsider RLS smoke: passed.

## Current Truths

- Production has 74 historical interactions and 76 historical group states; all remain null-scoped.
- Production has 11 currently contactable Vault targets with exact child-printing evidence.
- New compatible clients can create exact-printing conversations without altering legacy rows.
- Production has zero invalid parent/child interaction links.
- Production has zero duplicate conversation-state identity tuples.
- The deployed clients do not yet exercise the new column; final web and mobile candidates remain a separate gate.

## Invariants

- Parent and child identity must agree.
- Null means unrecorded or explicitly unassigned; it never authorizes inference.
- New exact-printing threads must not merge with another child or a legacy null thread.
- Only the sender and receiver may read an interaction.
- Only a state owner may read or mutate their conversation state.
- Contact-target visibility and trust-block rules remain authoritative.

## What Must Never Be Broken

- Do not backfill historical `card_printing_id` from present-day Vault assignments.
- Do not collapse distinct child printings into one message group.
- Do not expose internal user identity, private Vault state, or participant messages to outsiders.
- Do not grant write access to `anon` or through `v_card_contact_targets_v1`.
- Do not let messaging mutate canonical identity, Vault ownership, or pricing.

## Explicit Next Gate

Build and deploy clients from the exact repaired source, then prove on final Android, iPhone, desktop, and narrow web that:

1. a new exact-printing message displays the correct finish and child image;
2. Normal and Reverse Holo remain separate threads and states;
3. legacy messages display `Printing not recorded`;
4. participant/outsider behavior matches the production RLS proof;
5. Journeys A-F and the cross-platform state matrix pass before the final 72-hour soak begins.

