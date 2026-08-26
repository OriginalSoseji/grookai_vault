# Universal Catalog Automation V1 Checkpoint

## Context

Grookai must detect new sets and cards before collectors report them missing. The immediate reported cases were One Piece OP17, MTG The Hobbit, Japanese Pokemon Storm Emeralda, and Pikachu 133/M-P.

## Decision

Run read-only cross-TCG discovery every six hours, followed 30 minutes later by a bounded exact-promotion supervisor. Discovery is broad; mutation remains source-specific, insert-only, release-gated, collision-checked, and transactionally reconciled.

## Frozen Baseline

- Baseline date: `2026-08-26`
- Source sets checked: `1,257`
- Source requests: `301`
- Actionable gaps before promotion: `26`
- Reconciliation summary SHA-256: `bbfee5ec15e3cbcd4e441b1ee310594fdc7094283aa5a2f6916bb943f4194b34`
- Actionable gaps SHA-256: `5deb37cad23f1a68fb3890dd5dfa415ab17d41ad85b70d2738a88c7859e1edfb`
- Source-set artifact SHA-256: `d72ff38ca714d0ee46421708482459e573a0ee377c52be6b7b88c598885ac123`
- Source snapshot metadata SHA-256: `d75071dc501f89fce4087eae06c68345af46a8cad7ddfec05cc3636c7039b37b`

## Current Truths

- MTG: `987` source sets checked and `0` actionable gaps. The Hobbit is already complete: HOB `321`, HOC `153`, THOB `15`. Its reported absence was a search-alias problem.
- One Piece: `61` source sets checked and `0` actionable released gaps. Cross-set special prints are counted under their printed set, not the warehouse group in which TCGPlayer lists them.
- OP17: official release is `2026-08-28`; it remains a future release and produces zero durable writes before that date. Release-day rollback proof built `168` exact parent rows and held one number/name mismatch.
- Pokemon: `209` physical English/Japanese source sets checked and `26` actionable gaps. Pokemon TCG Pocket sets are excluded from the physical TCG lane.
- Storm Emeralda M6: `29` existing plus `84` planned equals `113` exact parent rows.
- Pikachu `133/M-P` already exists as `GV-PK-JPN-MP-133`; only official source evidence is missing, so no duplicate card is permitted.

## Rollback Proof

| Target | Existing | Planned cards | Evidence | Family reviews | Payload fingerprint |
|---|---:|---:|---:|---:|---|
| M4 Ninja Spinner | 51 | 69 | 208 | 69 | `7a17b99041311a2e8a9e3d1e0f2ab32e89c6b5fafb6d344fe3ce76e0d18d937e` |
| M5 Abyss Eye | 49 | 69 | 208 | 69 | `403507818671d610d4c1e18ec2b3876eb4fa21d1739cba089bf322f335af4869` |
| M6 Storm Emeralda | 29 | 84 | 213 | 84 | `907e006cbe1a9bddd4fbb371e2faa8cb4761f7ef52363f752f4dd83b69abae2b` |

All three proofs read back the exact inserted counts and then verified `0` cards, identities, evidence rows, and family-review rows after rollback.

## Invariants

- Discovery uses `begin transaction read only` and cannot mutate database or Storage state.
- Scheduled apply requires the exact clean default-branch SHA.
- Future releases, source ambiguity, unsupported source shapes, and count disagreement never write.
- No child printings, external image pointers, Storage objects, pricing, publication, or Vault data are written.
- External images remain evidence candidates until the self-hosted image pipeline promotes an exact asset.
- Search aliases are game-scoped and cannot reinterpret another TCG.
- Digital Pokemon TCG Pocket sets are not physical Pokemon catalog gaps.

## Remaining Work

- Apply and read back M4, M5, and M6 from the frozen clean commit.
- Verify Pikachu `133/M-P` receives official evidence without a duplicate card row.
- On or after `2026-08-28`, let the release-gated OP17 worker run; preserve the held `OP17-021` mismatch for review.
- Build a separately governed English Pokemon incremental writer for the `21` legacy incomplete sets and one missing miscellaneous-promo container. They remain issue-visible and cannot write today.
- Build a non-TCGdex Japanese starter-product writer for MEM and MEZ. They remain issue-visible and cannot write today.
- Run signed-in search smoke tests for `Hobbit`, `OP17`, `Storm Emeralda`, and `Pikachu WCS 2026` after deployment.

## Next Gate

Merge the tested automation, apply the three rollback-proven Japanese expansion deltas, perform exact production readback, and verify the first scheduled discovery/promotion workflows. Stop if any count, hash, collision, or boundary reconciliation differs.
