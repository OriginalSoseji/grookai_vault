# Special Variant Printing Authority V1

## Context

The prior printing coverage audit identified `563` special-variant parents with no child printing and only reference-level finish evidence. Most were stamped promotional printings discovered through JustTCG. The frozen printing contract prohibits treating that discovery transport as automatic child-printing authority.

This work ran in the isolated worktree `C:\grookai_vault_variant_search_release_repair` on `evidence/special-variant-printing-authority-v1`, based on commit `2b09bbde4b987a5ab27cef7b45fbfa4abeb5df43`. The primary dirty worktree was not modified.

## Problem

The queue mixed three distinct states:

- exact special-variant products with independently preserved catalog titles and finish subtypes;
- likely variants whose external product titles do not name the special printing;
- incomplete or conflicting source records.

Without a deterministic authority pass, Grookai could either leave provable child printings unavailable or create child identities from a source label that did not actually prove the variant.

## Risk

An over-broad repair could create the wrong stamped child, conflate a generic base finish with a special printing, accept stale catalog data, synthesize a `stamped` finish, or make an unreviewed child immediately public. Any of those outcomes would weaken canonical printing identity and downstream search, pricing, ownership, and display behavior.

## Decision

JustTCG remains discovery-only. It supplies a candidate TCGplayer product handle but never qualifies a child by itself.

A row reaches the guarded manifest only when all of these hold:

- the TCGCSV warehouse contains the same exact TCGplayer product ID;
- the catalog product is active, current, Pokémon category `3`, and payload-hashed;
- the card name and full source number match;
- a fractional number's denominator is supported by the verified set registry;
- the special variant is explicit in the TCGplayer catalog title;
- a recent payload-hashed TCGCSV price observation exposes the exact finish subtype;
- the finish agrees with discovery evidence;
- the verified English Master Index contains the exact canonical card and variant-or-finish support;
- no live parent, finish, identity, child, or GV-ID invariant conflicts.

## Alternatives Rejected

- Promoting all `563` JustTCG rows was rejected because discovery evidence is not printing authority.
- Treating a base-card `normal`, `holo`, or `reverse` fact as proof of a stamped variant was rejected.
- Treating generic product titles as proof of `play_pokemon_stamp` was rejected.
- Creating a synthetic `stamped` child finish was rejected; children use only actual governed finishes.
- Making future children visible by default was rejected. Any later apply must atomically create a `quarantined_candidate` sidecar with `hidden_pending_review` visibility.
- Applying rows before a successful transactionally rolled-back proof was rejected.

## Evidence Acquisition Result

Frozen queue:

- queue rows: `563`
- TCGCSV products found: `562`
- rows with recent finish observations: `542`
- authoritative guarded candidates: `143`
- blocked rows: `420`

Candidate finishes:

- `holo`: `115`
- `normal`: `25`
- `reverse`: `3`

Candidate variant concentration:

- `prerelease_stamp`: `59`
- `staff_prerelease_stamp`: `52`
- `e_league_stamp` and `e_league_winner_stamp`: `10`
- individually named set/event stamps: `22`

The largest blocked class is `play_pokemon_stamp`: `371` rows. Their catalog titles do not explicitly prove the Play! stamp, so they remain blocked even when their ordinary finish is known.

## Guarded Manifest Proof

The read-only live manifest reconciled all `143` accepted candidates:

- exact parents: `143`
- prospective child rows: `143`
- active governed finish keys: `143`
- exact active parent identities: `143`
- exact discovery mappings: `143`
- existing parent/finish child collisions: `0`
- prospective printing GV-ID collisions: `0`
- duplicate prospective GV-IDs: `0`
- rows ready for transactionally rolled-back simulation: `143`

No child rows or review rows were created.

## Transactional Rollback Gate

The rollback-only script was implemented with these controls:

- no apply mode;
- no commit path;
- deterministic prospective child and review UUIDs;
- one transaction for all transient rows;
- transient child and hidden review readback;
- unconditional rollback;
- durable before/after fingerprint comparison.

The first remote proof attempt could not run from this Windows host because both direct PostgreSQL and the linked Supabase pooler timed out on port `5432` before a session opened.

Recorded attempt:

- status: `blocked_database_connectivity_before_transaction`
- transaction started: `false`
- transient child writes: `0`
- transient review writes: `0`
- durable writes: `0`
- approvals: `0`
- public visibility changes: `0`

The identical frozen proof then ran successfully through GitHub Actions run `30947529006` at runner SHA `bf1ecb6913688913e84e3774fd7c4f3eccbc66d1`.

Successful rollback proof:

- targets: `143`
- transient child inserts: `143`
- transient hidden review inserts: `143`
- exact transient current-view readbacks: `143`
- transaction committed: `false`
- durable child writes: `0`
- durable review writes: `0`
- before fingerprint: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- after fingerprint: `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945`
- durable state unchanged: `true`

The temporary GitHub runner workflow was tag-only and was restored immediately after the proof. No Vercel branch deployment was created.

## Migration Applied

None. This gate created no migration and changed no schema.

## Database Writes

No durable writes. Authority acquisition and manifest generation used service-role SELECT requests only. The successful remote proof transiently inserted `143` children and `143` hidden review sidecars inside one transaction, read them back, and rolled the transaction back. Durable before/after fingerprints are identical.

## Current Truths

- `card_prints` remains canonical parent identity.
- `card_printings` remains child printing identity.
- JustTCG remains discovery-only.
- TCGCSV/TCGplayer catalog evidence can qualify an exact external printing only when identity, variant, finish, source health, and Master Index checks all pass.
- `143` rows are evidence-ready but not applied.
- The complete `143`-row rollback-only simulation passed.
- `420` rows remain blocked and must not be silently broadened.
- All prospective children remain absent from the database.
- No candidate is approved or publicly visible.

## Invariants

- Never create a child from JustTCG-only evidence.
- Never infer a Play! stamp from a generic product, ordinary finish, image, or market listing.
- Never use `stamped` as a synthetic child finish.
- Never overwrite an existing parent/finish child.
- Never reuse a printing GV-ID.
- Never change canonical parent identity to make a child fit.
- Never apply a candidate without preserving exact source IDs, titles, payload hashes, finish evidence, and authority fingerprint.
- Never make a newly applied special-variant child public before human review.
- Never proceed to real apply unless the rollback-only proof remains reproducible with identical durable before/after state.

## Verification

- focused authority and manifest contracts: passed
- rollback-script static safety contracts: passed
- broader printing, variant, consumer, web, mobile, and pricing-bridge contracts: `66/66` passed
- Node syntax checks: passed
- `git diff --check`: passed
- read-only authority reconciliation: passed
- read-only live manifest reconciliation: `143/143` passed
- Windows remote transaction attempt: blocked by PostgreSQL connectivity before transaction start, with zero writes
- GitHub Actions transactionally rolled-back simulation: passed `143/143` children and `143/143` hidden review sidecars
- durable before/after fingerprint equality: passed
- full pre-commit shipcheck: attempted; release secret guard passed, then repository runtime preflight stopped on the same direct PostgreSQL `ETIMEDOUT` before later full-suite stages ran

## Artifacts

- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_authority_v1.json`
- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_authority_v1.md`
- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_guarded_manifest_v1.json`
- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_guarded_manifest_v1.md`
- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_transactional_rollback_attempt_v1.json`
- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_transactional_rollback_attempt_v1.md`
- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_transactional_rollback_v1.json`
- `docs/audits/special_variant_printing_authority_v1/special_variant_printing_transactional_rollback_v1.md`
- `docs/audits/special_variant_printing_authority_v1/github_runner_metadata_v1.json`
- `docs/audits/special_variant_printing_authority_v1/artifact_hashes.sha256`

## What Must Never Be Broken

Evidence authority is a chain, not a label. Discovery may locate a candidate, but only exact catalog identity, exact variant language, exact finish evidence, verified canonical consistency, and live collision checks may advance it. Uncertainty must remain blocked rather than being converted into canonical child identity.

## Explicit Next Gate

Prepare a separately approved bounded real apply for at most `25` candidates. The apply must atomically insert each child with its `quarantined_candidate` and `hidden_pending_review` sidecar, preserve the exact frozen authority and manifest fingerprints, perform exact post-commit readback, and stop before approval or public visibility.

The remaining `118` evidence-ready candidates stay untouched until the first bounded apply reconciles cleanly. The `420` blocked rows remain outside the apply set.
