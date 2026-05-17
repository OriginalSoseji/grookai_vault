# SCANNER_SHUTTER_AUTHORITY_NO_WRONG_ID_CONTRACT_V1

## Status

Active.

This contract narrows scanner identity behavior after repeated live-device false
identifications proved that visual-neighbor voting cannot be the production
identity authority.

## Decision

Wrong ID is worse than no ID.

The scanner must fail closed when it cannot prove the exact card. A plausible
visual neighbor is not an acceptable result.

## Scope

Applies only to scanner identity behavior in:

- `lib/screens/scanner/`
- `lib/screens/scanner/widgets/`
- `lib/services/scanner/`
- `lib/services/scanner_v3/`
- `lib/services/scanner_v4/`
- `android/app/src/main/kotlin/com/example/grookai_vault/scanner/`
- scanner-specific identity service plumbing under `backend/identity_v3/`
- scanner docs, audits, contracts, parsers, and local harnesses

This contract does not authorize changes to OCR authority, detector thresholds,
ML models, Supabase schema, pricing, vault writes, public web behavior, auth, or
unrelated backend workers.

## Relationship To Existing Contracts

This contract works with and narrows:

- `SCANNER_FIXED_SLOT_CAPTURE_CONTRACT_V1`
- `SCANNER_NO_OCR_IDENTITY_AUTHORITY_CONTRACT_V1`
- `SCANNER_IDENTITY_PERFORMANCE_CONTRACT_V1`
- `SCANNER_LIVE_BEHAVIOR_CONTRACT_V1`
- `SCANNER_FULL_DB_IDENTITY_INDEX_CONTRACT_V1`

If an older scanner behavior implies that the live visual vote winner may become
the user-visible answer, this contract wins.

## Core Principle

Background identity work may prepare candidates, but the user-visible answer is
authorized only by the shutter/reveal identity contract.

The live scanner may say:

- searching
- align
- ready
- reading
- no match
- exact match

It must not say an exact card name unless the strict reveal authority accepts
that identity.

## Authority Model

The production scanner identity flow is:

```text
fixed slot / selected card crop
-> background visual ANN presearch
-> cached candidate evidence
-> user shutter/reveal
-> strict visual proof gate
-> exact card result OR no match
```

ANN/vector retrieval is a candidate generator. It is not final authority.

Fallback crop consensus is a recovery signal. It is not final authority by
itself.

Core/artwork/title-band crops may support ranking, but they must not promote a
visually plausible wrong card to an exact result without strict full-card proof.

## Strict Reveal Rules

The shutter/reveal path may accept a candidate only when the evidence is exact
enough to tolerate failing closed.

Allowed exact proof classes:

- strong full-card canonical visual match
- strict full-card same-name family match with very low distance
- future versioned multi-region verifier that proves full card, art, title band,
  and bottom identity region agree

Rejected as final authority:

- one-frame live visual vote winner
- core-crop-only consensus
- artwork-only consensus
- title-band-only consensus
- OCR title, set, or number
- plausible neighbor with no strict full-card proof
- any candidate whose proof depends on detector box luck

## Background Presearch Rules

Background identity work is allowed only to reduce reveal latency.

It may:

- warm the identity service
- cache candidates per selected slot/card
- accumulate visual evidence
- prepare a likely result for reveal

It must not:

- set a user-visible exact identity before reveal
- keep a stale lock after the selected crop changes
- override the strict shutter authority
- leak one slot's candidates into another slot

## No-Match Behavior

No match is a valid production outcome when evidence is weak, blurry, glared,
ambiguous, or visually close to multiple cards.

The scanner should provide retry/manual-search paths, but it must not make up an
answer.

## Performance Rule

The under-2-second target remains binding only for accepted exact matches.

Speed does not justify a wrong result. If strict proof cannot be produced under
2 seconds, the scanner must show no match or keep reading briefly under the
existing performance contract.

## Stop Rules

Stop and audit before continuing if a scanner change:

- makes the live vote winner the final answer again
- uses OCR as identity authority
- accepts core/artwork/title-band consensus as exact proof by itself
- weakens strict full-card proof to make a hard card pass
- changes detector thresholds as the primary correctness strategy
- writes to Supabase or changes schema
- touches pricing, vault, auth, public web, or unrelated workers

## Acceptance

This contract is satisfied when scanner identity can be wrong-neighbor tested
and the result is either:

- exact card accepted from strict full-card proof
- no match

Any visually plausible but wrong card shown as an exact result is a contract
failure.
