# JAPANESE_MASTER_INDEX_COMPLETION_V1

Status: Satisfied by Japanese Master Index V4 final package
Date: 2026-07-27

Completion evidence:

- final package:
  `docs/audits/japanese_master_index_v4/index/jpn_master_index_final_package_v1.json`;
- final status: `complete_no_write_master_index`;
- package content fingerprint:
  `d2935a74683c02b3ad6e4c845b804b6fcd3694dbf30c139e4e1b0126a3136455`;
- fresh production comparison was transaction-guarded and read-only;
- no database, Storage, pricing, identity, image, family-promotion, cleanup,
  quarantine, or deletion write was performed or authorized.

## Purpose

`JAPANESE_MASTER_INDEX_COMPLETION_V1` defines the completion standard for
Grookai's Japanese physical Pokemon TCG Master Index.

The Japanese index is an acquisition and evidence product feeding the same
Master Identity Graph as English. It is not a separate database, a separate
family system, or a Japanese copy of English assumptions.

This contract authorizes index artifacts only. It does not authorize database,
Storage, pricing, image-pointer, visibility, family-promotion, cleanup, or
quarantine writes.

## Governing Principles

### One Identity Graph

Japanese physical print identities remain language-specific nodes in the
language-agnostic Master Identity Graph:

```text
physical Japanese print identity
  -> Japanese set/product identity
  -> language-agnostic species/character/concept family
  -> optional cross-language print relationship
```

An English print is never reused as the identity of a Japanese print. English
families may be referenced read-only when establishing a language-agnostic
family relationship.

### Master Index Before Reconciliation

External evidence is collected, normalized, preserved, and adjudicated before
the resulting index is compared with Grookai's canonical database.

The live database may be read as evidence of prior work and drift. It is not
the Master Index and cannot prove its own completeness.

### Set Registry Before Card Resolution

No card identity may become master-admissible until its release container is
classified as one of:

- expansion or subset;
- promo series;
- constructed deck or starter product;
- gift box or product-exclusive release;
- tournament, trophy, event, or campaign distribution;
- vending or other governed historical series;
- magazine, movie, or media distribution;
- non-standard reference lane;
- out of scope.

Source-owned placeholders such as `tcgcollector:<id>` or `artofpkm:<id>` may
exist in working evidence but are forbidden in the final admissible export.

### Preserve Evidence, Never Reset It

Live source unavailability, alias changes, rate limits, and later source
deletions must not erase previously preserved evidence.

Every acquired assertion retains:

- source key and source class;
- source URL or stable source identifier;
- retrieval timestamp;
- raw artifact path;
- raw artifact SHA-256;
- adapter and parser version;
- source-native set, product, number, name, rarity, and variant labels;
- normalized interpretations as separate fields.

### Identity Is Not Finish

Identity modifiers and physical finishes are modeled independently.

Edition marks, owner/trainer names, campaign marks, deck origin, stamp text,
product distribution, corrected art/text, and other printed differences are
identity candidates unless evidence proves they describe only a physical
finish.

No finish fact may be inferred solely from era, rarity, product type, source
terminology, or an English equivalent.

## Scope

In scope:

- Japanese-language physical Pokemon TCG cards officially released or
  distributed for the Japanese market;
- expansions, subsets, promos, decks, product exclusives, tournament cards,
  trophy cards, campaign cards, vending releases, and official jumbo cards;
- exact set/product identity;
- printed card number or governed unnumbered identity;
- Japanese printed name;
- collector-facing English display name, kept separate from printed identity;
- rarity and card-type evidence;
- identity modifiers and printing/finish evidence;
- preserved source assertions;
- language-agnostic family candidates;
- cross-language family relationships;
- conflicts, exclusions, and manual-review queues.

Out of scope unless separately adjudicated:

- unofficial cards, proxies, reproductions, and altered cards;
- stickers, postcards, phone cards, and merchandise that are not Pokemon TCG
  cards;
- prototype, sample, test, or unreleased cards without sufficient evidence;
- Pokemon TCG Pocket;
- price truth;
- ownership or vault state;
- any database or Storage mutation.

## Fact Model

### Set or Product Identity

Required fields:

- `jpn_set_key`;
- canonical Japanese release name;
- collector-facing English release name;
- release kind;
- era;
- release date or bounded date evidence;
- official set/product code when one exists;
- source aliases;
- expected card-count evidence by source;
- parent set or product relationship when applicable;
- completion status.

### Card Identity

Required fields:

- `jpn_card_identity_key`;
- `jpn_set_key`;
- language and market;
- printed number or governed unnumbered key;
- Japanese printed name;
- collector-facing English display name when supported;
- identity modifier;
- edition, regulation, or distribution mark evidence;
- card type;
- source assertions;
- evidence status;
- conflict status.

### Printing or Finish Fact

Required fields:

- parent `jpn_card_identity_key`;
- canonical finish key;
- exact source evidence;
- stamp or distribution details when applicable;
- source-label aliases;
- confidence and adjudication status.

### Family Relationship

Required fields:

- Japanese card identity key;
- language-agnostic family key;
- relationship type;
- evidence basis;
- confidence;
- review status.

The relationship may not alter either the Japanese or English physical
identity.

## Evidence Admission

### Officially Indexed Card

An exact official Japanese card-search result or official product/checklist
page may admit existence when it proves:

```text
release container + printed number/unnumbered identity + printed name
```

Independent corroboration is still required for disputed identity modifiers,
product-only variants, stamps, and finishes not explicit in the official
record.

### Non-Official Admission

When no usable official record exists, card identity requires at least two
independent source families agreeing on the exact identity.

At least one source must be human-readable, checklist-style, archival, or an
exact card image with provenance. Two mirrors of the same upstream data do not
count as independent.

### Printing or Finish Admission

A printing or finish fact requires:

```text
source_count >= 2
AND exact card-level agreement
AND at least one human-readable, official, checklist, archival, or
    provenance-bearing image source
AND no unresolved conflict
```

### Marketplace Evidence

Marketplace and auction evidence may corroborate a rare or historical card
only when exact identity is visible. Marketplace title text alone is never
admissible truth.

## Source Classes

Priority source classes:

1. Official Pokemon Card Game Japan card search, product pages, checklists,
   campaign pages, and event pages.
2. TCGCollector Japanese set/card checklists.
3. Art of Pokemon, Limitless, Pokellector, and equivalent collector
   references.
4. TCGdex Japanese structured data.
5. Bulbapedia card, set, deck, promo, campaign, and distribution pages.
6. PokeGuardian and historical release reporting.
7. Magazine, event, tournament, campaign, and collector archives.
8. Marketplace and auction evidence as bounded secondary review evidence.

Every adapter must identify whether its data is original, mirrored, derived,
or manually curated so independence is not overstated.

## Statuses

Allowed set statuses:

- `complete_master_index_set`;
- `identity_complete_finish_incomplete`;
- `source_agreed_identity`;
- `source_limited`;
- `conflict_blocked`;
- `manual_review_required`;
- `source_unavailable`;
- `non_standard_reference_lane`;
- `out_of_scope`.

Allowed fact statuses:

- `master_admissible`;
- `official_identity_supported`;
- `multi_source_identity_supported`;
- `working_candidate`;
- `single_source_only`;
- `conflicting`;
- `needs_manual_review`;
- `source_unavailable`;
- `adjudicated_excluded`;
- `out_of_scope`.

No uncertainty status may be silently promoted to `master_admissible`.

## Completion Standard

The Japanese Master Index is complete only when:

1. Every set/product discovered by any governed source is represented in the
   set registry or explicitly adjudicated.
2. Every source card assertion is mapped to a working identity, blocked
   conflict, adjudicated exclusion, or out-of-scope record.
3. No source-owned placeholder set key remains in the admissible export.
4. No unresolved exact identity collision remains.
5. Every admissible card has at least one preserved evidence lane and satisfies
   its applicable admission rule.
6. Every printing/finish fact satisfies the stricter printing admission rule.
7. Promos, decks, product exclusives, trophies, campaigns, vending, and
   unnumbered cards have explicit coverage reports.
8. Every admissible Pokemon card has a reviewed language-agnostic species
   relationship or a documented reason none applies.
9. Every non-Pokemon card has a classified family domain or documented
   non-family status.
10. Rebuilding from the same preserved evidence is deterministic.
11. English reference fingerprints are unchanged.
12. The no-write verifier proves zero database, Storage, pricing, identity,
    image, family-promotion, cleanup, and quarantine mutations.

Raw card count is a coverage signal, not the definition of completion.
Completion is source-exhaustion plus deterministic adjudication.

## Required Outputs

The build must emit versioned JSON and Markdown under:

```text
docs/audits/japanese_master_index_v4/
```

Required artifacts:

- source manifest and preservation ledger;
- read-only Grookai baseline;
- Japanese set/product registry;
- set alias map;
- source assertion union;
- card identity candidates;
- resolved identities;
- printing/finish facts;
- family relationship candidates;
- coverage matrix;
- source gap queue;
- conflict/manual-review queue;
- adjudicated exclusions;
- master-admissible export;
- build manifest with SHA-256 fingerprints;
- completion report.

No SQL apply file, migration, or mutation runner is an allowed output.

## Runtime No-Write Boundary

Any script in this build that reads Grookai must:

- use a database transaction declared `READ ONLY`;
- set `default_transaction_read_only = on`;
- reject SQL containing mutation or DDL keywords;
- refuse `--apply`, `--write`, `--mutate`, and equivalent flags;
- record the queried environment and schema fingerprint without recording
  credentials;
- exit non-zero if the no-write guard cannot be established.

Source acquisition may write only versioned local evidence artifacts.

## Final Principle

The Japanese Master Index must be broader than any one source and more honest
than a forced union.

```text
Preserve broadly.
Resolve conservatively.
Link families explicitly.
Publish only proven identities.
```
