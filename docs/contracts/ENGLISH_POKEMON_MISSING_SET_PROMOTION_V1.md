# English Pokemon Missing Set Promotion V1

Status: Active

Date: 2026-11-14

## Purpose

Admit a newly released English Pokemon set only when the checked-in English
Master Index and the current TCGdex structured set prove the same complete
parent-card scope. This is the missing-set companion to
`ENGLISH_POKEMON_INCREMENTAL_PROMOTION_V1`; it does not weaken Master Index,
printing-truth, or visibility rules.

## Admission

The writer may run only when:

- the release date is not in the future;
- no canonical Pokemon set already owns the source code;
- the English Master Index contains exactly the TCGdex full-set count;
- every admitted card identity is `master_verified` with at least two
  independent preserved sources;
- every proposed parent resolves to exactly one Pokemon species or to an exact
  Trainer/Energy identity;
- the source and proposed canonical set codes are equal after case
  normalization;
- set, release-control, parent, GV-ID, natural-coordinate, identity, evidence,
  and family-review collision preflights are all zero.

## Atomic Write Envelope

Permitted in one transaction:

- one `public.sets` row;
- one hidden `public.catalog_set_release_controls` row;
- the exact full-set parent `card_prints` rows;
- one active identity per parent;
- preserved Master Index source-evidence rows;
- pending, non-promotable family-review rows.

Every new parent remains explicitly suppressed. Canonical admission does not
authorize public visibility.

Forbidden:

- child printing creation;
- external mapping creation;
- pricing or publication writes;
- Storage or image-pointer writes;
- Vault, ownership, or customer-state writes;
- updates, deletes, merges, or migrations.

## Execution Proof

The writer must:

1. build and fingerprint the exact payload from the frozen commit and sources;
2. prove zero collisions;
3. insert the entire payload in a dry-run transaction;
4. read back exact expected counts;
5. roll back and prove zero retained rows;
6. apply only the same fingerprinted payload;
7. commit once and prove durable readback.

Source, commit, count, fingerprint, release-date, or database-owner drift fails
closed. A later image, printing, mapping, pricing, or visibility release remains
a separate governed workflow.
