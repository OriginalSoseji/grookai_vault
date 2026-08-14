# Cross-TCG Sealed Product No-Publication Canary V1

## Status

Future contract only. This file does not authorize execution.

## Preconditions

- The sealed-domain migration fingerprint has explicit approval.
- The schema-only migration has applied successfully.
- Schema, constraints, triggers, RLS, policies, and grants have been read back.
- No app-facing sealed view or RPC exists.
- The exact canary source-product IDs and source payload hashes are frozen.

## Envelope

- Maximum `20` candidate staging rows.
- Maximum `10` canonical variants.
- At least one candidate each from Pokemon, Pokemon Japan, Magic, and One Piece.
- Package-form coverage must include a pack, box/display, deck, and collection
  or bundle.
- Zero ambiguous promotions.
- Zero card-domain rows.
- Zero price values or publication snapshots.
- One draft release manifest; active release pointer remains unchanged.

## Apply Sequence

1. Write a frozen plan with IDs, payload hashes, classifier version, expected
   identities, and rollback scope.
2. Insert candidate staging rows only.
3. Read back all candidate evidence and classifications.
4. Append founder-reviewed decisions for the bounded sealed candidates.
5. Insert family, variant, evidence, and exact source mapping rows for confirmed
   candidates only.
6. Insert `pending` pricing-lane qualification hooks without price values.
7. Build a `draft` release membership manifest.
8. Prove the active release pointer did not change.
9. Reconcile every planned, written, and read-back row and artifact hash.
10. Stop without publication or client integration.

## Stop Conditions

Stop immediately on duplicate source ownership, identity-fingerprint collision,
missing evidence, ambiguous role, non-sealed/card classification, unexpected
grant, active release-pointer change, or any proposed write outside the sealed
domain.

## Acceptance

- All writes reconcile exactly to the frozen canary plan.
- Every canonical row traces to confirmed review and source evidence.
- No family or variant identity can be mutated.
- No source product maps to multiple variants.
- All pricing hooks remain non-publication `pending` rows.
- The release remains `draft` and no client can read it.

## Exact Next Gate After Canary

Design a private service read model and bounded pricing qualification canary.
Do not create public or authenticated client access in the canary task.
