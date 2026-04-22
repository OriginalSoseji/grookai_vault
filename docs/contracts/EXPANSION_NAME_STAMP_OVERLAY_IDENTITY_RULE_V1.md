# EXPANSION_NAME_STAMP_OVERLAY_IDENTITY_RULE_V1

Status: ACTIVE
Type: Printed Identity Rule Extension
Scope: stamped rows whose explicit stamp label names a canonical expansion or set

## Purpose

Some stamped rows already carry the expansion identity in the printed overlay itself:

- `Destined Rivals Stamp`
- `Brilliant Stars Stamp`
- `Twilight Masquerade Stamp`
- `Black Bolt Stamp`

This rule makes those rows deterministic without guessing. The stamp label selects
the underlying expansion first, then the base card is resolved inside that routed
set by printed evidence.

## Identity Basis

The stamped identity remains:

- base canonical identity
- plus stamped `variant_key`

The underlying base identity must be resolved from:

1. the explicit expansion name in the stamp label
2. the stripped base printed name
3. the printed number
4. the printed total when present

## Set Routing Rule

When a stamped row carries an explicit expansion-name stamp:

1. remove the trailing `Stamp` token from `stamp_label`
2. map that root to authoritative canonical set rows by `sets.name`
3. search only inside those routed set codes

If the stamp root does not map to an authoritative set name, the row is not ready.

## Number Handling Rule

The stamped row keeps its printed identity unchanged.

For underlying base resolution only:

- leading-zero number forms are equivalent to their normalized numeric form
- printed-total evidence must still agree with the routed set family

Examples:

- `070/182` may route to base `70`
- `034/086` may route to base `034`

The printed identity is not rewritten. This rule only governs base matching.

## Name Handling Rule

Base resolution uses the stripped printed base name after removing:

- explicit stamp-name parentheticals
- `Stamped` / `Stamp`
- event-only overlay segments already carried by `variant_key`

The rule does not guess across materially different printed names.

## Inclusion

This rule applies only when all of the following are true:

1. `stamp_label` explicitly names an expansion or set
2. the stamped modifier is already resolved deterministically
3. the routed set family contains exactly one base row matching stripped name plus printed number and total

## Exclusion

This rule does not apply when:

- the stamp label is only a family hint
- the stamp label does not map to an authoritative set name
- multiple base rows remain possible
- the source name disagrees materially with the only routed base row

Example exclusion:

- `Larvitar (Delta Species Stamp)` cannot auto-route if the only base row is `Larvitar d` and the printed-name equivalence is not proven.

## Result

Rows that satisfy this rule may leave `STAMPED_MANUAL_REVIEW` and enter the
normal stamped ready queue.
