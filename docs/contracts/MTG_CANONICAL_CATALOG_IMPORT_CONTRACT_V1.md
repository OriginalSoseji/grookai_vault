# MTG Canonical Catalog Import Contract V1

## Status

Dry-run contract. No database or Storage apply is authorized.

## Objective

Create a complete English paper Magic: The Gathering print catalog whose
identities can be linked to TCGPlayer market evidence without name inference.
The catalog is canonical product truth. TCGCSV remains source price evidence.

## Sources And Authority

### Canonical print candidate source

Scryfall `default_cards` JSONL bulk data supplies one card object per print,
stable Scryfall print and set UUIDs, exact collector-number tokens, language,
paper/digital availability, frame and treatment attributes, finishes, image
references, and TCGPlayer product IDs where available.

Only rows with `lang = en`, `games` containing `paper`, and `digital != true`
enter the V1 candidate catalog.

### Market evidence source

TCGCSV TCGPlayer category `1` supplies groups, products, source images, and
daily `Normal` and `Foil` prices. Its price identity remains:

```text
tcgplayer:<productId>:<normalized subtypeName>
```

`productId` alone is not a printing identity.

## Source Use Requirements

The Scryfall API documentation states that its card data and image database is
provided for creating additional Magic software, research, and community
content under the Wizards Fan Content Policy. Grookai must preserve these
requirements:

- do not imply Scryfall endorsement;
- do not paywall the underlying Scryfall card data;
- do not present the data or images as another game;
- add collector value rather than repackaging or proxying Scryfall;
- keep full card copyright and artist attribution visible;
- do not crop, distort, recolor, sharpen, watermark, or otherwise alter full
  card images;
- identify the artist and source when an art crop is ever used.

Contract source: `https://scryfall.com/docs/api`, reviewed 2026-08-13.
Bulk access must use one versioned export rather than card-by-card API calls.

## Canonical Identity

Each eligible Scryfall card object becomes one parent `card_print` candidate.

```text
identity_domain = mtg_eng_paper_print
identity_key_version = MTG_ENG_PAPER_PRINT_IDENTITY_V1
parent gv_id = GV-MTG-SF-<full Scryfall print UUID>
variant_key = scryfall:<full Scryfall print UUID>
print_identity_key = scryfall:<full Scryfall print UUID>
```

The identity payload preserves:

- Scryfall print UUID and Oracle UUID;
- Scryfall set UUID, set code, set type, and release date;
- exact collector-number token, including stars, daggers, letters, and other
  nonnumeric forms;
- language;
- name;
- layout;
- frame and frame effects;
- border color and security stamp;
- full-art, textless, promo, and variation state;
- promo types;
- available finishes.

`number_plain` remains compatibility-only and can never define MTG identity.
The legacy `card_prints.tcgplayer_id` remains null for imported MTG parents
because one TCGPlayer product can span multiple finish-specific print objects.

## Printing And Finish Identity

Each parent receives child `card_printings` for its supported finishes:

```text
nonfoil -> normal
foil    -> foil
etched  -> etched
```

Printing GV IDs are:

```text
<parent gv_id>-NORMAL
<parent gv_id>-FOIL
<parent gv_id>-ETCHED
```

Normal and Foil are in Production V1 pricing scope. Etched is imported as
canonical finish truth but excluded from V1 publication until a separate
market-lane contract is approved.

## Exact TCGPlayer Mapping

Scryfall `tcgplayer_id` maps only the source product. The candidate's supported
finish determines the exact source subtype:

```text
tcgplayer_id + nonfoil -> productId:normal -> normal child
tcgplayer_id + foil    -> productId:foil   -> foil child
```

Scryfall `tcgplayer_etched_id` is preserved as an etched candidate and remains
outside V1 publication.

An exact mapping is valid only when one `productId + subtype` has one canonical
printing owner. Multiple owners are quarantined. The resolver may not choose a
winner from card name, set similarity, collector-number normalization, image,
or price.

## Dry-Run Result

Frozen Scryfall default-card bulk export:

```text
updated_at: 2026-08-13T09:05:26.070Z
bulk objects: 116,703
English paper print candidates: 104,712
set candidates: 953
planned finish children: 158,262
candidates with image references: 104,550
candidates without TCGPlayer links: 5,845
```

Production TCGPlayer reconciliation:

```text
active Magic products: 117,267
exact linked product IDs: 97,918
exact product IDs present: 97,917
exact product IDs absent: 1
exact product/subtype candidate lanes: 148,346
exact supported Normal/Foil lanes: 144,482
exact positive marketPrice lanes: 142,690
etched links preserved outside V1: 1,155
product/subtype ownership collisions: 26
warehouse products not linked by Scryfall: 19,350
```

The 26 collisions are quarantined mapping gaps. They do not invalidate the
underlying canonical print candidates. Examples include alternate star or
dagger collector numbers sharing a TCGPlayer lane, cross-set product reuse,
and token or promotional anomalies.

Frozen payload hashes are recorded in the reconciliation audit's
`summary.json` and must be restated in any apply approval.

## Image Policy

Scryfall image URLs are acquisition references only. Before a canonical image
pointer is written:

1. download the full, unmodified card image;
2. hash bytes and record source URL, Scryfall print UUID, artist, and source
   bulk version;
3. upload to a deterministic Grookai Storage path;
4. read back and verify exact bytes/hash;
5. update only the corresponding MTG parent or printing pointer;
6. preserve the complete copyright and artist line in the displayed image.

No broad image upload is part of the first database canary.

## Service-Only Staging Gate

The first durable database target is not the shared canonical tables. A
fingerprinted canary payload must first be inserted into immutable,
service-only MTG import staging tables.

- `anon` and `authenticated` receive no privileges;
- RLS is enabled on batch and row tables;
- only `select` and `insert` are granted to `service_role`;
- staged rows preserve the exact intended canonical payload as JSONB;
- no game, set, card, printing, mapping, image, or price row is created;
- promotion is a separate transaction and approval boundary.

This staging gate is required because existing generic card and set read
models can discover shared canonical rows before MTG product surfaces are
ready. A canonical canary may not claim zero app visibility merely because it
has no published price.

## Required Canonical Schema Gate

The first migration package must be idempotent and limited to:

- insert the `mtg` game;
- add `mtg_eng_paper_print` to the identity-domain check;
- add `foil` and `etched` finish keys;
- add `scryfall` to allowed image provenance;
- add no MTG-specific columns unless the dry-run proves existing JSON identity
  payloads are insufficient;
- preserve all Pokémon rows and constraints.

After staging is accepted, the existing `sets`, `card_prints`, identity,
printing, external mapping, and MEE publication tables remain the promotion
targets.

## Apply Sequence

1. Produce a service-only staging migration and remote preflight.
2. Generate a frozen zero-write canary payload for one ordinary expansion set
   with Normal and Foil rows and zero collision lanes.
3. Prove the complete staging migration and payload in one rollback
   transaction.
4. Apply the staging migration and immutable payload only after an exact
   fingerprint approval.
5. Review the staged payload, then apply the canonical foundation migration
   only after a separate promotion gate.
6. Promote the one-set canonical canary only after proving app visibility is
   explicitly controlled.
7. Read back game, set, parent, identity, child printing, and external mapping
   counts and hashes.
8. Run search/API/RLS smoke tests with MTG hidden from public clients.
9. Build a bounded exact-price shadow for the imported set.
10. Stop before publication, image population, or full-catalog import.

## Invariants

- No Pokémon identity, pricing, Vault, or image row may change.
- Canonical candidates without prices remain valid canonical cards.
- Unlinked source products remain warehouse evidence.
- Collisions remain quarantined and immutable until separately adjudicated.
- Source image availability never authorizes a pointer write.
- No public or signed-in MTG surface is enabled by catalog import alone.
