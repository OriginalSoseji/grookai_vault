# PROMO_PREFIX_IDENTITY_RULE_V1

Status: ACTIVE
Type: GV-ID Printed Number Contract
Scope: promo-family canonical identities whose printed number requires a set-specific prefix token

## Rule

When a promo family uses a prefixed printed number, canonical GV-ID generation must use the
printed prefix plus collector token, not raw `number_plain` alone.

For the governed promo families:

| set_code | printed token format |
|----------|----------------------|
| bwp | BW### |
| smp | SM### |
| swshp | SWSH### |
| svp | SVP### |

The identity token used for GV-ID generation must preserve that printed prefix authority.

## Invariants

- `number_plain` remains the numeric join key for slot lookup and duplicate detection.
- Prefixed promo identity is a GV-ID and printed-number concern, not a stamped-identity concern.
- Executor planning must carry both `set_code` and `number_plain`, then derive the lawful promo token
  for GV-ID generation when the family requires it.
- Raw numeric `number_plain` must not replace a required promo prefix token in the canonical GV-ID.

## Current Activation Boundary

This repair pass activates the rule for `smp`.

- `smp` rows must generate `GV-PK-SM-SM###...`
- Existing `bwp` stamped canon rows are not rewritten in this pass.
- `swshp` and `svp` are documented here for the same rule family, but their activation remains a
  separate bounded migration.

## Examples

- `smp / Malamar / number_plain=117` -> promo identity token `SM117`
- `smp / Blacephalon / number_plain=221 / staff_prerelease_stamp` -> `GV-PK-SM-SM221-STAFF-PRERELEASE-STAMP`
- `bwp / Crobat / BW51` remains outside this repair scope; no retroactive migration is implied here

## Non-Goals

This contract does not:

- rerun warehouse intake or promotion by itself
- modify stamped identity law
- rewrite existing canonical promo GV-IDs outside the bounded repair pass
- change mapping or image closure behavior
